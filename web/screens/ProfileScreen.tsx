import {
  BookOpen,
  CloudCog,
  Droplet,
  Dumbbell,
  History,
  Pencil,
  Ruler,
  Settings,
  Target,
  Users,
  Utensils,
  MapPin,
} from 'lucide-react';
import { useAppStore, useProfilePhoto } from '../store';
import { formatNumber } from '../lib/format';
import { tutorial } from '../lib/tutorial';
import { useNavigation } from '../navigation/Navigator';
import { GoogleButton, useGoogleSignIn } from '../features/GoogleSignIn';
import { SyncBadge } from '../features/StatusBits';
import { IconButton } from '../ui/Button';
import { Avatar } from '../ui/Feedback';
import { Card, GroupLabel, ListGroup, ListRow, TabHeader } from '../ui/Layout';

export function ProfileScreen() {
  const {
    userProfile,
    currentUser,
    history,
    prs,
    goals,
    streakWeeks,
    measurements,
    gyms,
  } = useAppStore();
  const latestWeight = measurements.find((item) => item.weightKg)?.weightKg;
  const photo = useProfilePhoto();
  const { push } = useNavigation();
  const { signIn, signingIn } = useGoogleSignIn();
  const activeGoals = goals.filter((goal) => goal.status === 'active').length;
  const since = history.at(-1)?.completedAt;

  return (
    <>
      <TabHeader
        wide
        title="Perfil"
        actions={
          <IconButton
            icon={Settings}
            label="Configurações"
            onClick={() => push({ name: 'settings' })}
          />
        }
      />

      {/* Desktop: profile card on the left, the menus on the right. */}
      <div className="app-wide lg:grid lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:items-start lg:gap-8 lg:px-8">
        <div className="app-column space-y-4 px-4 pt-2 lg:px-0">
          <Card className="overflow-hidden">
            <div className="flex items-center gap-4 p-4">
              <Avatar name={userProfile.name} photoUrl={photo} size={64} />
              <div className="min-w-0 flex-1">
                <h2 className="text-title truncate font-bold">
                  {userProfile.name}
                </h2>
                <p className="text-footnote truncate text-ink-2">
                  @{userProfile.username}
                  {userProfile.experience && ` · ${userProfile.experience}`}
                </p>
                {currentUser && <SyncBadge className="mt-1.5" />}
              </div>
              <IconButton
                icon={Pencil}
                label="Editar perfil"
                variant="raised"
                size="sm"
                onClick={() => push({ name: 'editProfile' })}
              />
            </div>
            {userProfile.bio && (
              <p className="text-callout -mt-1 px-4 pb-4 whitespace-pre-line text-ink-2">
                {userProfile.bio}
              </p>
            )}
            <dl className="grid grid-cols-3 divide-x divide-line border-t border-line">
              {[
                { label: 'Treinos', value: history.length },
                { label: 'Recordes', value: prs.length },
                {
                  label:
                    streakWeeks === 1 ? 'Semana seguida' : 'Semanas seguidas',
                  value: streakWeeks,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col-reverse items-center px-2 py-3 text-center"
                >
                  <dt className="text-caption text-ink-2">{item.label}</dt>
                  <dd className="font-metric text-metric-sm">
                    {formatNumber(item.value, 0)}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>

          {since && (
            <p className="text-footnote px-1 text-ink-3">
              Primeiro treino registrado em{' '}
              {new Date(since).toLocaleDateString('pt-BR', {
                month: 'long',
                year: 'numeric',
              })}
              .
            </p>
          )}

          {!currentUser && (
            <Card className="p-4">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-md bg-brand-soft text-brand-ink">
                  <CloudCog size={20} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-headline font-semibold">
                    Guarde seu progresso na nuvem
                  </h2>
                  <p className="text-callout mt-1 text-ink-2">
                    Hoje seus treinos estão só neste aparelho. Entre para
                    sincronizar e não perder nada se trocar de celular.
                  </p>
                </div>
              </div>
              <GoogleButton
                className="mt-4"
                onClick={signIn}
                loading={signingIn}
                label="Entrar com o Google"
              />
            </Card>
          )}
        </div>

        <div className="app-column lg:-mt-4">
          <GroupLabel>Treino</GroupLabel>
          <ListGroup>
            <ListRow
              icon={History}
              title="Diário de treinos"
              value={
                history.length > 0 ? formatNumber(history.length, 0) : undefined
              }
              onClick={() => push({ name: 'history' })}
            />
            <ListRow
              icon={Dumbbell}
              title="Exercícios"
              onClick={() => push({ name: 'library' })}
            />
            <ListRow
              icon={MapPin}
              title="Academias"
              value={gyms.length > 0 ? formatNumber(gyms.length, 0) : undefined}
              onClick={() => push({ name: 'gyms' })}
            />
            <ListRow
              icon={Target}
              title="Metas"
              value={activeGoals > 0 ? `${activeGoals} ativas` : undefined}
              onClick={() => push({ name: 'goals' })}
            />
          </ListGroup>

          <GroupLabel>Saúde</GroupLabel>
          <ListGroup>
            <ListRow
              icon={Ruler}
              title="Medidas corporais"
              value={
                latestWeight ? `${formatNumber(latestWeight, 1)} kg` : undefined
              }
              onClick={() => push({ name: 'measurements' })}
            />
            <ListRow
              icon={Droplet}
              title="Hidratação"
              onClick={() => push({ name: 'hydration' })}
            />
            <ListRow
              icon={Utensils}
              title="Nutrição"
              onClick={() => push({ name: 'nutrition' })}
            />
          </ListGroup>

          <GroupLabel>Comunidade</GroupLabel>
          <ListGroup>
            <ListRow
              icon={Users}
              title="Desafios e amigos"
              subtitle="Ranking semanal e desafios em grupo"
              onClick={() => push({ name: 'social' })}
            />
          </ListGroup>

          <GroupLabel>App</GroupLabel>
          <ListGroup>
            <ListRow
              icon={Settings}
              title="Configurações"
              subtitle="Tema, conta, importar e backup"
              onClick={() => push({ name: 'settings' })}
            />
            <ListRow
              icon={BookOpen}
              title="Ver tutorial"
              onClick={tutorial.show}
            />
          </ListGroup>
        </div>
      </div>
    </>
  );
}
