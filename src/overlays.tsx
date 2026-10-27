import Alert from '@cloudscape-design/components/alert';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import Spinner from '@cloudscape-design/components/spinner';
import SpaceBetween from '@cloudscape-design/components/space-between';

export interface GridOverlayParams {
  message: string;
}

export interface GridErrorOverlayParams extends GridOverlayParams {
  onRetry?: () => void;
  retryText?: string;
}

export function CloudscapeNoRowsOverlay({ message }: GridOverlayParams) {
  return (
    <div role="status" aria-live="polite">
      <Box
        textAlign="center"
        color="text-status-inactive"
        fontSize="body-s"
        padding={{ vertical: 'm' }}
      >
        {message}
      </Box>
    </div>
  );
}

export function CloudscapeLoadingOverlay({ message }: GridOverlayParams) {
  return (
    <div role="status" aria-live="polite">
      <Box textAlign="center" padding={{ vertical: 'm' }}>
        <SpaceBetween size="xs">
          <Spinner size="normal" />
          <Box color="text-body-secondary" fontSize="body-s">
            {message}
          </Box>
        </SpaceBetween>
      </Box>
    </div>
  );
}

export function CloudscapeErrorOverlay({
  message,
  onRetry,
  retryText = 'Retry',
}: GridErrorOverlayParams) {
  return (
    <div role="alert" style={{ pointerEvents: 'auto' }}>
      <Box padding={{ horizontal: 's', vertical: 's' }}>
        <Alert
          type="error"
          action={
            onRetry ? (
              <Button onClick={onRetry}>{retryText}</Button>
            ) : undefined
          }
        >
          {message}
        </Alert>
      </Box>
    </div>
  );
}
