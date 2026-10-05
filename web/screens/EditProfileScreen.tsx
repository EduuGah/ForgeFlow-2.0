import { useRef, useState } from 'react';
import { Camera, ImagePlus, Trash2 } from 'lucide-react';
import { actions, useAppStore, useProfilePhoto } from '../store';
import { squarePhotoDataUrl } from '../lib/image';
import type { UserProfile } from '../lib/types';
import { useNavigation } from '../navigation/Navigator';
import { Button, Spinner } from '../ui/Button';
import { Avatar } from '../ui/Feedback';
import { NumberField, SelectField, TextAreaField, TextField } from '../ui/Form';
import { StackHeader } from '../ui/Layout';
import { ActionSheet, useConfirm, useToast } from '../ui/Overlay';
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
  return [
    { value: '', label: 'Não informado' },
    ...list.map((value) => ({ value, label: value })),
  ];
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
  const photo = useProfilePhoto();
  const [photoMenu, setPhotoMenu] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const galleryInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  // The photo is saved right away, apart from the form's Salvar button.
  const choosePhoto = async (file: File | undefined) => {
    if (!file) return;
    setSavingPhoto(true);
    try {
      actions.setProfilePhoto(await squarePhotoDataUrl(file));
      toast({ tone: 'success', title: 'Foto atualizada' });
    } catch (error) {
      toast({
        tone: 'error',
        title: 'Não foi possível usar essa foto',
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSavingPhoto(false);
    }
  };

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
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={() => setPhotoMenu(true)}
            aria-label="Alterar foto do perfil"
            className="pressable relative rounded-[32%]"
          >
            <Avatar name={draft.name} photoUrl={photo} size={96} />
            <span className="absolute -right-1 -bottom-1 grid size-9 place-items-center rounded-full bg-brand text-on-brand ring-4 ring-canvas">
              {savingPhoto ? (
                <Spinner size={16} />
              ) : (
                <Camera size={17} aria-hidden="true" />
              )}
            </span>
          </button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPhotoMenu(true)}
            disabled={savingPhoto}
          >
            Alterar foto
          </Button>
        </div>
        <input
          ref={galleryInput}
          type="file"
          accept="image/*"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            void choosePhoto(file);
          }}
        />
        <input
          ref={cameraInput}
          type="file"
          accept="image/*"
          capture="user"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            void choosePhoto(file);
          }}
        />
        <ActionSheet
          open={photoMenu}
          onClose={() => setPhotoMenu(false)}
          title="Foto do perfil"
          actions={[
            {
              label: 'Escolher da galeria',
              icon: ImagePlus,
              onSelect: () => galleryInput.current?.click(),
            },
            {
              label: 'Tirar foto',
              icon: Camera,
              onSelect: () => cameraInput.current?.click(),
            },
            ...(userProfile.photoDataUrl
              ? [
                  {
                    label: currentUser?.photoURL
                      ? 'Voltar para a foto do Google'
                      : 'Remover foto',
                    icon: Trash2,
                    tone: 'danger' as const,
                    onSelect: () => {
                      actions.setProfilePhoto(null);
                      toast({ title: 'Foto removida' });
                    },
                  },
                ]
              : []),
          ]}
        />

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
            zeroAsEmpty
            placeholder="—"
            max={400}
            onValueChange={(value) => set('weightKg', value)}
          />
          <NumberField
            label="Altura"
            suffix="cm"
            value={draft.heightCm}
            zeroAsEmpty
            placeholder="—"
            max={260}
            onValueChange={(value) => set('heightCm', value)}
          />
        </div>
      </form>
    </>
  );
}
