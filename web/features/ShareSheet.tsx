import { Image, MessageSquareText } from 'lucide-react';
import { ActionSheet, useToast } from '../ui/Overlay';

/**
 * "Compartilhar": as text (WhatsApp, notes) or as a stories picture. The
 * callers say how to make each one; this sheet handles the outcome toasts.
 */
export function ShareSheet({
  open,
  onClose,
  title,
  text,
  image,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  text: () => Promise<'shared' | 'copied' | 'failed'>;
  image: () => Promise<'shared' | 'downloaded' | 'failed'>;
}) {
  const toast = useToast();
  const failed = () =>
    toast({ tone: 'error', title: 'Não foi possível compartilhar' });
  return (
    <ActionSheet
      open={open}
      onClose={onClose}
      title={title}
      actions={[
        {
          label: 'Texto',
          description: 'Para WhatsApp, notas ou onde quiser',
          icon: MessageSquareText,
          onSelect: async () => {
            const result = await text();
            if (result === 'copied')
              toast({
                tone: 'success',
                title: 'Texto copiado',
                description: 'Cole no WhatsApp ou onde quiser.',
              });
            else if (result === 'failed') failed();
          },
        },
        {
          label: 'Imagem para Stories',
          description: 'Uma imagem vertical com seus números',
          icon: Image,
          onSelect: async () => {
            const result = await image();
            if (result === 'downloaded')
              toast({
                tone: 'success',
                title: 'Imagem salva',
                description: 'Está nos seus downloads.',
              });
            else if (result === 'failed') failed();
          },
        },
      ]}
    />
  );
}
