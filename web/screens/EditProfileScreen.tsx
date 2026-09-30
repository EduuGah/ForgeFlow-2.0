import { useState } from 'react';
import { actions, useAppStore } from '../store';
import type { UserProfile } from '../lib/types';
import { useNavigation } from '../navigation/Navigator';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Feedback';
import { NumberField, SelectField, TextAreaField, TextField } from '../ui/Form';
import { StackHeader } from '../ui/Layout';
import { useConfirm, useToast } from '../ui/Overlay';
import { useBackGuard } from '../ui/core';

const EXPERIENCE = ['Iniciante', 'Intermediário', 'Avançado'];
const GOALS = [
  'Hipertrofia e força',
  'Força máxima',
  'Emagrecimento',
  'Condicionamento',
  'Saúde e bem-estar',
];

type Draft = Pick<
  UserProfile,
  | 'name'
  | 'username'
  | 'bio'
  | 'experience'
  | 'mainGoal'
  | 'weightKg'
  | 'heightCm'
>;

function withCurrent(options: string[], current: string) {
  const list =
    current && !options.includes(current) ? [current, ...options] : options;
  return list.map((value) => ({ value, label: value }));
}

export function EditProfileScreen() {
  const { userProfile, currentUser } = useAppStore();
  const { pop } = useNavigation();
  const confirm = useConfirm();
  const toast = useToast();
  const initial: Draft = {
    name: userProfile.name,
    username: userProfile.username,
    bio: userProfile.bio,
    experience: userProfile.experience,
    mainGoal: userProfile.mainGoal,
    weightKg: userProfile.weightKg,
    heightCm: userProfile.heightCm,
  };
  // Initialized once per visit, so a cloud sync that lands later does not
  // overwrite what the person is typing.
  const [draft, setDraft] = useState<Draft>(initial);
  const [submitted, setSubmitted] = useState(false);

  const dirty = (Object.keys(initial) as (keyof Draft)[]).some(
    (key) => draft[key] !== initial[key],
  );
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const confirmLeave = () =>
    confirm({
      title: 'Descartar alterações?',
      message: 'As mudanças no seu perfil ainda não foram salvas.',
      confirmLabel: 'Descartar',
      cancelLabel: 'Continuar editando',
      tone: 'danger',
    });

  useBackGuard(dirty, async (rearm) => {
    if (await confirmLeave()) pop();
    else rearm();
  });

  const leave = async () => {
    if (!dirty || (await confirmLeave())) pop();
  };

  const nameError =
    submitted && draft.name.trim().length < 2 ? 'Informe seu nome.' : undefined;
  const usernameInvalid =
    draft.username !== initial.username &&
    !/^[a-z0-9._-]{3,30}$/.test(draft.username);
  const usernameError =
    submitted && usernameInvalid
      ? 'Use de 3 a 30 letras minúsculas, números, ponto, hífen ou _.'
      : undefined;

  const save = () => {
    setSubmitted(true);
    if (draft.name.trim().length < 2 || usernameInvalid) return;
    actions.updateProfile({
      ...draft,
      name: draft.name.trim(),
      bio: draft.bio.trim(),
    });
    toast({ tone: 'success', title: 'Perfil atualizado' });
    pop();
  };

  return (
    <>
      <StackHeader
        title="Editar perfil"
        onBack={leave}
        right={
          <Button size="sm" disabled={!dirty} onClick={save}>
            Salvar
          </Button>
        }
      />
      <form
        className="app-column space-y-5 px-4 pt-6"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <div className="flex flex-col items-center gap-2">
          <Avatar
            name={draft.name}
            photoUrl={currentUser?.photoURL}
            size={96}
          />
          <p className="text-footnote text-ink-3">
            {currentUser
              ? 'A foto vem da sua conta Google.'
              : 'Entre com Google para usar sua foto.'}
          </p>
        </div>

        <h2 className="text-callout pt-2 text-ink-2">Dados públicos</h2>
        <TextField
          label="Nome"
          value={draft.name}
          maxLength={100}
          onChange={(event) => set('name', event.target.value)}
          error={nameError}
        />
        <TextField
          label="Nome de usuário"
          value={draft.username}
          maxLength={30}
          autoCapitalize="none"
          autoCorrect="off"
          onChange={(event) =>
            set('username', event.target.value.toLowerCase().replace(/\s/g, ''))
          }
          error={usernameError}
        />
        <TextAreaField
          label="Bio"
          value={draft.bio}
          rows={3}
          maxLength={300}
          placeholder="Conte um pouco sobre seus treinos"
          onChange={(event) => set('bio', event.target.value)}
          hint={`${draft.bio.length}/300`}
        />

        <h2 className="text-callout pt-2 text-ink-2">
          Dados de treino (privados)
        </h2>
        <SelectField
          label="Experiência"
          value={draft.experience}
          onChange={(value) => set('experience', value)}
          options={withCurrent(EXPERIENCE, draft.experience)}
        />
        <SelectField
          label="Objetivo principal"
          value={draft.mainGoal}
          onChange={(value) => set('mainGoal', value)}
          options={withCurrent(GOALS, draft.mainGoal)}
        />
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Peso"
            suffix="kg"
            decimal
            value={draft.weightKg}
            max={400}
            onValueChange={(value) => set('weightKg', value)}
          />
          <NumberField
            label="Altura"
            suffix="cm"
            value={draft.heightCm}
            max={260}
            onValueChange={(value) => set('heightCm', value)}
          />
        </div>
      </form>
    </>
  );
}
