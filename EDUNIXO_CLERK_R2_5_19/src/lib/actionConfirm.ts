export type ActionConfirmTone = 'danger' | 'warning' | 'primary';

export interface ActionConfirmRequest {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ActionConfirmTone;
}

const EVENT_NAME = 'edunixo_action_confirm_request';
let pendingResolve: ((value: boolean) => void) | null = null;

export function requestActionConfirm(
  request: string | ActionConfirmRequest,
): Promise<boolean> {
  const detail: ActionConfirmRequest = typeof request === 'string'
    ? { message: request, title: 'Confirm action', confirmLabel: 'Confirm', cancelLabel: 'Cancel', tone: 'warning' }
    : {
        title: request.title || 'Confirm action',
        message: request.message,
        confirmLabel: request.confirmLabel || 'Confirm',
        cancelLabel: request.cancelLabel || 'Cancel',
        tone: request.tone || 'warning',
      };

  // Never leave an older promise hanging if a second destructive action is triggered.
  if (pendingResolve) {
    pendingResolve(false);
    pendingResolve = null;
  }

  return new Promise<boolean>((resolve) => {
    pendingResolve = resolve;
    window.dispatchEvent(new CustomEvent<ActionConfirmRequest>(EVENT_NAME, { detail }));
  });
}

export function resolveActionConfirm(value: boolean) {
  const resolve = pendingResolve;
  pendingResolve = null;
  resolve?.(value);
}

export const ACTION_CONFIRM_EVENT = EVENT_NAME;
