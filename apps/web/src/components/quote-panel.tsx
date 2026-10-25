import { todayIso } from "@humara-neta/api/day";
import {
  CARD_TEXT_WARN,
  QUOTE_NOTE_MAX,
  QUOTE_PLACE_MAX,
} from "@humara-neta/api/quote-limits";
import { Button, buttonVariants } from "@humara-neta/ui/components/button";
import { Input } from "@humara-neta/ui/components/input";
import { Label } from "@humara-neta/ui/components/label";
import { Textarea } from "@humara-neta/ui/components/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useId, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";

import { orpc } from "@/utils/orpc";

interface QuoteDraft {
  cards: string[];
  editorialNote: string;
  date: string;
  place: string;
}

/** A Card being edited: `id` keeps React pointed at the right field when rows move. */
interface CardDraft {
  id: string;
  text: string;
}

interface QuoteFormProps {
  initial?: QuoteDraft & { permalink: string };
  submitLabel: string;
  pending: boolean;
  failure: Error | null;
  onSubmit: (draft: QuoteDraft) => void;
  onCancel?: () => void;
}

/** Past this many Cards the Carousel stops being something a reader swipes through. */
const CARDS_BEFORE_WARNING = 4;

/**
 * One form for adding a Quote and for correcting one. A Quote is entered as an
 * ordered list of Cards, because the editor decides where the breaks fall; the
 * permalink's slug is taken from the first Card on first save and then frozen.
 */
function QuoteForm({
  initial,
  submitLabel,
  pending,
  failure,
  onSubmit,
  onCancel,
}: QuoteFormProps) {
  const id = useId();
  // Initial ids are derived from the array, so the server and the browser
  // render the same markup; a Card added in the browser gets a fresh one.
  const [cards, setCards] = useState<CardDraft[]>(() =>
    (initial?.cards ?? [""]).map((text, index) => ({
      id: `initial-${index}`,
      text,
    }))
  );
  const [editorialNote, setEditorialNote] = useState(
    initial?.editorialNote ?? ""
  );
  const [date, setDate] = useState(initial?.date ?? "");
  const [place, setPlace] = useState(initial?.place ?? "");

  function setCard(cardId: string, text: string) {
    setCards((current) =>
      current.map((card) => (card.id === cardId ? { ...card, text } : card))
    );
  }

  /** Moves one Card one place up or down; the array order is the reading order. */
  function moveCard(cardId: string, by: number) {
    setCards((current) => {
      const from = current.findIndex((card) => card.id === cardId);
      const to = from + by;

      if (from === -1 || to < 0 || to >= current.length) {
        return current;
      }

      const moved = [...current];
      const [card] = moved.splice(from, 1);

      if (card) {
        moved.splice(to, 0, card);
      }

      return moved;
    });
  }

  function addCard() {
    setCards((current) => [...current, { id: crypto.randomUUID(), text: "" }]);
  }

  function removeCard(cardId: string) {
    setCards((current) => current.filter((card) => card.id !== cardId));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // A row the editor added and left blank is not a Card they meant to write.
    onSubmit({
      cards: cards
        .map((card) => card.text)
        .filter((text) => text.trim() !== ""),
      editorialNote,
      date,
      place,
    });
  }

  return (
    <form className="flex flex-col gap-3 border p-4" onSubmit={submit}>
      <div className="flex flex-col gap-2">
        {cards.map((card, index) => (
          <div className="flex flex-col gap-1" key={card.id}>
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor={`${id}-card-${card.id}`}>Card {index + 1}</Label>
              <div className="flex gap-1">
                <Button
                  aria-label={`Move Card ${index + 1} up`}
                  disabled={index === 0}
                  onClick={() => moveCard(card.id, -1)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Up
                </Button>
                <Button
                  aria-label={`Move Card ${index + 1} down`}
                  disabled={index === cards.length - 1}
                  onClick={() => moveCard(card.id, 1)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Down
                </Button>
                {cards.length > 1 ? (
                  <Button
                    onClick={() => removeCard(card.id)}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            </div>
            <Textarea
              id={`${id}-card-${card.id}`}
              onChange={(event) => setCard(card.id, event.target.value)}
              placeholder="The words, exactly as they were said."
              rows={3}
              value={card.text}
            />
            {card.text.length > CARD_TEXT_WARN ? (
              <p className="text-muted-foreground text-xs">
                {card.text.length} characters — long for one Card. Consider
                splitting it.
              </p>
            ) : null}
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={addCard} size="sm" type="button" variant="outline">
            Add Card
          </Button>
          {cards.length > CARDS_BEFORE_WARNING ? (
            <p className="text-muted-foreground text-xs">
              {cards.length} Cards is a long Carousel: readers swipe through
              every one.
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor={`${id}-note`}>Editorial note</Label>
        <Textarea
          id={`${id}-note`}
          maxLength={QUOTE_NOTE_MAX}
          onChange={(event) => setEditorialNote(event.target.value)}
          placeholder="The context a reader needs beside the Quote."
          required
          rows={3}
          value={editorialNote}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${id}-date`}>Date (optional)</Label>
          <Input
            id={`${id}-date`}
            max={todayIso()}
            onChange={(event) => setDate(event.target.value)}
            type="date"
            value={date}
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor={`${id}-place`}>Place (optional)</Label>
          <Input
            id={`${id}-place`}
            maxLength={QUOTE_PLACE_MAX}
            onChange={(event) => setPlace(event.target.value)}
            placeholder="Kolkata, or Esplanade, Kolkata"
            value={place}
          />
        </div>
      </div>

      {initial === undefined ? null : (
        <p className="text-muted-foreground text-xs">
          Permalink: <span className="font-mono">/{initial.permalink}</span> —
          fixed once saved, so links to it keep working.
        </p>
      )}

      {failure === null ? null : (
        <p className="text-destructive text-xs" role="alert">
          {failure.message}
        </p>
      )}

      <div className="flex gap-2">
        <Button disabled={pending} size="sm" type="submit">
          {pending ? "Saving…" : submitLabel}
        </Button>
        {onCancel === undefined ? null : (
          <Button onClick={onCancel} size="sm" type="button" variant="ghost">
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

/**
 * The panel's Quotes section: pick a Person, see their Quotes, add one or
 * correct one. Both roles reach it; archiving and curation do not live here.
 */
export function QuotePanel() {
  const queryClient = useQueryClient();
  const people = useQuery(orpc.person.list.queryOptions());
  const [chosenPersonId, setChosenPersonId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const personSelectId = useId();
  // The add form is emptied by remounting it: its state belongs to the fields
  // being typed into, not to the panel.
  const [blankForms, setBlankForms] = useState(0);

  const personId = chosenPersonId || people.data?.[0]?.id || "";
  const selectedPerson = people.data?.find((person) => person.id === personId);

  const quotes = useQuery({
    ...orpc.quote.listForPerson.queryOptions({ input: { personId } }),
    enabled: personId !== "",
  });

  function refreshQuotes() {
    return queryClient.invalidateQueries({
      queryKey: orpc.quote.listForPerson.queryKey({ input: { personId } }),
    });
  }

  const create = useMutation(
    orpc.quote.create.mutationOptions({
      onSuccess: async () => {
        await refreshQuotes();
        setBlankForms((count) => count + 1);
        toast.success("Quote added.");
      },
    })
  );

  const update = useMutation(
    orpc.quote.update.mutationOptions({
      onSuccess: async (revised) => {
        await Promise.all([
          refreshQuotes(),
          queryClient.invalidateQueries({
            queryKey: orpc.quote.bySlug.queryKey({
              input: {
                personSlug: selectedPerson?.slug ?? "",
                quoteSlug: revised.slug,
              },
            }),
          }),
        ]);
        setEditingId(null);
        toast.success("Quote saved.");
      },
    })
  );

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 className="font-medium">Quotes</h2>
        <p className="text-muted-foreground text-sm">
          Each Quote is one or more Cards of text, an Editorial note, and an
          optional Date and Place. It gets its own permalink under its Person.
        </p>
      </header>

      {people.data === undefined && (
        <p className="text-muted-foreground text-sm">Loading…</p>
      )}

      {people.data?.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Add a Person before adding a Quote.
        </p>
      )}

      {people.data !== undefined && people.data.length > 0 && (
        <>
          <div className="flex flex-col gap-1">
            <Label htmlFor={personSelectId}>Person</Label>
            <select
              className="border-input bg-background h-9 w-full border px-2 text-sm"
              id={personSelectId}
              onChange={(event) => {
                setChosenPersonId(event.target.value);
                setEditingId(null);
              }}
              value={personId}
            >
              {people.data.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </div>

          <QuoteForm
            failure={create.error}
            key={`new-${blankForms}`}
            onSubmit={(draft) => create.mutate({ ...draft, personId })}
            pending={create.isPending}
            submitLabel="Add Quote"
          />

          {quotes.data === undefined && (
            <p className="text-muted-foreground text-sm">Loading…</p>
          )}

          {quotes.data?.length === 0 && (
            <p className="text-muted-foreground text-sm">
              No Quotes under {selectedPerson?.name ?? "this Person"} yet.
            </p>
          )}

          {quotes.data !== undefined && quotes.data.length > 0 && (
            <ul className="divide-border divide-y border-y">
              {quotes.data.map((quote) => (
                <li key={quote.id} className="py-4">
                  {editingId === quote.id ? (
                    <QuoteForm
                      failure={update.error}
                      initial={{
                        cards: quote.cards.map((card) => card.text),
                        editorialNote: quote.editorialNote,
                        date: quote.date ?? "",
                        place: quote.place ?? "",
                        permalink: `${selectedPerson?.slug ?? ""}/${quote.slug}`,
                      }}
                      onCancel={() => setEditingId(null)}
                      onSubmit={(draft) =>
                        update.mutate({
                          ...draft,
                          id: quote.id,
                          personId,
                          slug: quote.slug,
                        })
                      }
                      pending={update.isPending}
                      submitLabel="Save changes"
                    />
                  ) : (
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-col gap-1">
                        <p className="text-sm">
                          {quote.cards[0]?.text}
                          {quote.cards.length > 1
                            ? ` (+${quote.cards.length - 1} more Card)`
                            : null}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          {quote.editorialNote}
                        </p>
                        <p className="text-muted-foreground font-mono text-xs">
                          /{selectedPerson?.slug}/{quote.slug}
                        </p>
                        {quote.date === null && quote.place === null ? null : (
                          <p className="text-muted-foreground text-xs">
                            {[quote.date, quote.place]
                              .filter((value) => value !== null)
                              .join(" · ")}
                          </p>
                        )}
                        <p className="text-muted-foreground text-xs">
                          Last edited by{" "}
                          {quote.updatedByName ?? "someone since removed"}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Link
                          className={buttonVariants({
                            size: "sm",
                            variant: "ghost",
                          })}
                          params={{
                            personSlug: selectedPerson?.slug ?? "",
                            quoteSlug: quote.slug,
                          }}
                          rel="noopener"
                          target="_blank"
                          to="/$personSlug/$quoteSlug"
                        >
                          View
                        </Link>
                        <Button
                          onClick={() => setEditingId(quote.id)}
                          size="sm"
                          variant="outline"
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
