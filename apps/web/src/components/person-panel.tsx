import {
  PERSON_BIO_MAX,
  PERSON_NAME_MAX,
} from "@humara-neta/api/person-limits";
import { slugify } from "@humara-neta/api/slug";
import { Button } from "@humara-neta/ui/components/button";
import { Input } from "@humara-neta/ui/components/input";
import { Label } from "@humara-neta/ui/components/label";
import { Textarea } from "@humara-neta/ui/components/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";

import { orpc } from "@/utils/orpc";

interface PersonDraft {
  name: string;
  bio: string;
}

interface PersonFormProps {
  initial?: PersonDraft & { slug: string };
  submitLabel: string;
  pending: boolean;
  failure: Error | null;
  onSubmit: (draft: PersonDraft) => void;
  onCancel?: () => void;
}

/**
 * One form for adding a Person and for correcting one. The slug is shown
 * once it exists but is not a field: it is set from the name on first save and
 * then frozen, because links to it are already circulating (ADR-0001).
 */
function PersonForm({
  initial,
  submitLabel,
  pending,
  failure,
  onSubmit,
  onCancel,
}: PersonFormProps) {
  const id = useId();
  const [name, setName] = useState(initial?.name ?? "");
  const [bio, setBio] = useState(initial?.bio ?? "");

  // What the slug is, or what it is about to become. Shown rather than asked
  // for: it is derived from the name and then frozen.
  const shownSlug = initial?.slug ?? slugify(name);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({ name, bio });
  }

  return (
    <form className="flex flex-col gap-3 border p-4" onSubmit={submit}>
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${id}-name`}>Name</Label>
        <Input
          id={`${id}-name`}
          maxLength={PERSON_NAME_MAX}
          onChange={(event) => setName(event.target.value)}
          required
          value={name}
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor={`${id}-bio`}>Short bio</Label>
        <Textarea
          id={`${id}-bio`}
          maxLength={PERSON_BIO_MAX}
          onChange={(event) => setBio(event.target.value)}
          placeholder="Who they are, in a sentence or two."
          rows={3}
          value={bio}
        />
      </div>

      {shownSlug === "" ? null : (
        <p className="text-muted-foreground text-xs">
          Slug: <span className="font-mono">/{shownSlug}</span>
          {initial === undefined
            ? " — set from the name on first save and then fixed. A number is added if another Person has it."
            : " — fixed once saved, so links to it keep working."}
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
 * The panel's Persons section: everyone with a page, and the way to add or
 * correct one. Writers of both roles reach it; archiving does not live here.
 */
export function PersonPanel() {
  const queryClient = useQueryClient();
  const people = useQuery(orpc.person.list.queryOptions());
  const [editingId, setEditingId] = useState<string | null>(null);
  // The add form is emptied by remounting it: its state belongs to the fields
  // being typed into, not to the panel.
  const [blankForms, setBlankForms] = useState(0);

  function refreshList() {
    return queryClient.invalidateQueries({
      queryKey: orpc.person.list.queryKey(),
    });
  }

  const create = useMutation(
    orpc.person.create.mutationOptions({
      onSuccess: async (created) => {
        await refreshList();
        setBlankForms((count) => count + 1);
        toast.success(`${created.name} added.`);
      },
    })
  );

  const update = useMutation(
    orpc.person.update.mutationOptions({
      onSuccess: async (revised) => {
        await Promise.all([
          refreshList(),
          queryClient.invalidateQueries({
            queryKey: orpc.person.bySlug.queryKey({
              input: { slug: revised.slug },
            }),
          }),
        ]);
        setEditingId(null);
        toast.success(`${revised.name} saved.`);
      },
    })
  );

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 className="font-medium">Persons</h2>
        <p className="text-muted-foreground text-sm">
          Each Person gets a page at their own slug. Names and bios can be
          corrected; a slug cannot be moved.
        </p>
      </header>

      <PersonForm
        failure={create.error}
        key={blankForms}
        onSubmit={(draft) => create.mutate(draft)}
        pending={create.isPending}
        submitLabel="Add Person"
      />

      {people.data === undefined ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : (
        <ul className="divide-border divide-y border-y">
          {people.data.map((person) => (
            <li key={person.id} className="py-4">
              {editingId === person.id ? (
                <PersonForm
                  failure={update.error}
                  initial={{ ...person, bio: person.bio ?? "" }}
                  onCancel={() => setEditingId(null)}
                  onSubmit={(draft) =>
                    update.mutate({
                      id: person.id,
                      name: draft.name,
                      bio: draft.bio,
                      slug: person.slug,
                    })
                  }
                  pending={update.isPending}
                  submitLabel="Save changes"
                />
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <p className="font-medium">{person.name}</p>
                    <p className="text-muted-foreground font-mono text-xs">
                      /{person.slug}
                    </p>
                    {person.bio === null ? null : (
                      <p className="text-sm">{person.bio}</p>
                    )}
                  </div>
                  <Button
                    onClick={() => setEditingId(person.id)}
                    size="sm"
                    variant="outline"
                  >
                    Edit
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
