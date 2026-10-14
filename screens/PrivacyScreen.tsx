/**
 * PrivacyScreen — "Privacy & data": export (GDPR Art. 15), rectification
 * (Art. 16) and two-step account deletion (Art. 17) against the portal's
 * /api/privacy/* routes.
 *
 * Deletion is deliberately a four-gate flow: (1) preview call that deletes
 * nothing, (2) a distinct destructive button, (3) an Alert.alert confirmation,
 * (4) the confirm call with the single-use token from step 1.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { useAuthContext } from '../lib/auth-provider';
import { theme, radius, spacing } from '../lib/ui/theme';
import { StateView } from '../components/StateView';
import {
  PortalPrivacyError,
  confirmAccountDeletion,
  exportMyData,
  previewAccountDeletion,
  rectifyMyData,
  type DeletionPreview,
  type PrivacyExport,
} from '../lib/clients/portalPrivacy';

interface Props {
  /** Dismiss the screen (host renders it in a Modal). */
  onClose?: () => void;
}

type Busy = null | 'export' | 'rectify' | 'preview' | 'delete';

function describeError(err: unknown): string {
  if (err instanceof PortalPrivacyError) {
    if (err.isRateLimited) {
      const minutes = err.retryAfterSeconds ? Math.max(1, Math.ceil(err.retryAfterSeconds / 60)) : null;
      return minutes
        ? `Too many requests. Try again in about ${minutes} minute${minutes === 1 ? '' : 's'}.`
        : 'Too many requests. Please try again later.';
    }
    if (err.status === 401 || err.status === 404) {
      return 'Your session could not be verified. Sign out, sign back in and try again.';
    }
    return err.message;
  }
  return err instanceof Error ? err.message : 'Something went wrong. Please try again.';
}

function humanize(key: string): string {
  return key.replace(/_/g, ' ');
}

/** Section name -> row count, for the on-screen export summary. */
function summarizeExport(data: PrivacyExport): Array<[string, number]> {
  const sections: Array<[string, unknown]> = [
    ['council_sessions', data.council_sessions],
    ['council_messages', data.council_messages],
    ['council_usage', data.council_usage],
    ['nuai_usage', data.nuai_usage],
    ['watchlist_items', data.watchlist_items],
    ['disclaimer_acks', data.disclaimer_acks],
    ['consent_records', data.consent_records],
    ['legal_consent_events', data.legal_consent_events],
  ];
  return sections.map(([name, rows]) => [name, Array.isArray(rows) ? rows.length : 0]);
}

export default function PrivacyScreen({ onClose }: Props) {
  const { getToken, isSignedIn } = useAuth();
  const { signOut } = useAuthContext();
  const [busy, setBusy] = useState<Busy>(null);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  // Export
  const [exportData, setExportData] = useState<PrivacyExport | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // Rectify
  const [field, setField] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [requestedValue, setRequestedValue] = useState('');
  const [reason, setReason] = useState('');
  const [rectifyMessage, setRectifyMessage] = useState<{ ok: boolean; text: string } | null>(null);

  // Delete
  const [preview, setPreview] = useState<DeletionPreview | null>(null);
  const [previewExpiresAt, setPreviewExpiresAt] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const requireToken = useCallback(async (): Promise<string> => {
    const token = await getToken();
    if (!token) throw new Error('You are signed out. Sign in and try again.');
    return token;
  }, [getToken]);

  // ---- Export ----
  const handleExport = async () => {
    setBusy('export');
    setExportError(null);
    try {
      const data = await exportMyData(await requireToken());
      if (mounted.current) setExportData(data);
    } catch (err) {
      if (mounted.current) setExportError(describeError(err));
    } finally {
      if (mounted.current) setBusy(null);
    }
  };

  const handleShareExport = async () => {
    if (!exportData) return;
    try {
      // RN's built-in share sheet (no new native dependency); the full JSON is the message.
      await Share.share({ message: JSON.stringify(exportData, null, 2), title: 'nuwrrrld-data-export.json' });
    } catch (err) {
      setExportError(describeError(err));
    }
  };

  // ---- Rectify ----
  const canSubmitRectify = field.trim().length > 0 && requestedValue.trim().length > 0 && busy === null;

  const handleRectify = async () => {
    setBusy('rectify');
    setRectifyMessage(null);
    try {
      const result = await rectifyMyData(await requireToken(), {
        field: field.trim(),
        requested_value: requestedValue.trim(),
        ...(currentValue.trim() ? { current_value: currentValue.trim() } : {}),
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      });
      if (!mounted.current) return;
      setRectifyMessage({ ok: true, text: result.note });
      setField('');
      setCurrentValue('');
      setRequestedValue('');
      setReason('');
    } catch (err) {
      if (mounted.current) setRectifyMessage({ ok: false, text: describeError(err) });
    } finally {
      if (mounted.current) setBusy(null);
    }
  };

  // ---- Delete: step 1 (preview, deletes nothing) ----
  const resetDeletion = (message: string | null) => {
    setPreview(null);
    setPreviewExpiresAt(null);
    setDeleteError(message);
  };

  const handlePreviewDeletion = async () => {
    setBusy('preview');
    setDeleteError(null);
    try {
      const result = await previewAccountDeletion(await requireToken());
      if (!mounted.current) return;
      setPreview(result);
      setPreviewExpiresAt(Date.now() + result.token_expires_in_seconds * 1000);
    } catch (err) {
      if (mounted.current) setDeleteError(describeError(err));
    } finally {
      if (mounted.current) setBusy(null);
    }
  };

  // ---- Delete: step 2 (irreversible) ----
  const performDeletion = async (deletionToken: string) => {
    setBusy('delete');
    setDeleteError(null);
    try {
      const result = await confirmAccountDeletion(await requireToken(), deletionToken);
      // Data is gone and the Clerk user is normally deleted; end the local session either way.
      try {
        await signOut();
      } catch (signOutErr) {
        console.warn('Sign-out after account deletion failed:', signOutErr);
      }
      if (!result.clerk_account_deleted) {
        Alert.alert(
          'Data deleted',
          'Your data was erased, but your sign-in account could not be removed automatically. Contact support to finish closing it.',
        );
      }
    } catch (err) {
      if (!mounted.current) return;
      if (err instanceof PortalPrivacyError && err.isTokenInvalid) {
        resetDeletion('The confirmation expired. Review what will be deleted and confirm again.');
      } else {
        // erasure_failed is rolled back server-side: nothing deleted, account intact.
        setDeleteError(describeError(err));
      }
    } finally {
      if (mounted.current) setBusy(null);
    }
  };

  const handleConfirmDeletion = () => {
    if (!preview) return;
    if (previewExpiresAt !== null && Date.now() >= previewExpiresAt) {
      resetDeletion('The confirmation expired. Review what will be deleted and confirm again.');
      return;
    }
    const deletionToken = preview.token;
    Alert.alert(
      'Delete your account permanently?',
      'This erases your data and your account. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete forever', style: 'destructive', onPress: () => void performDeletion(deletionToken) },
      ],
    );
  };

  if (!isSignedIn) {
    return (
      <View style={styles.container}>
        <StateView
          state="empty"
          emptyTitle="Sign in required"
          emptyMessage="Sign in to manage your data and privacy."
        />
      </View>
    );
  }

  const retained = preview
    ? Object.entries(preview.not_deleted).filter(([key]) => key !== 'clerk_account')
    : [];
  const clerkNote = preview?.not_deleted.clerk_account;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {onClose && (
        <Pressable onPress={onClose} accessibilityRole="button" style={styles.backRow}>
          <Text style={styles.backText}>{'< Close'}</Text>
        </Pressable>
      )}
      <Text style={styles.title}>Privacy & data</Text>

      {/* ConsentPreferences mounts here — see feat/consent-ui-signup */}

      {/* Export */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Export my data</Text>
        <Text style={styles.body}>Download a copy of the personal data we hold about you. Limited to 3 exports per hour.</Text>
        <Pressable
          style={[styles.button, busy !== null && styles.disabled]}
          onPress={handleExport}
          disabled={busy !== null}
          accessibilityRole="button"
        >
          {busy === 'export' ? (
            <ActivityIndicator color={theme.text.inverse} />
          ) : (
            <Text style={styles.buttonText}>Request export</Text>
          )}
        </Pressable>
        {exportError && <Text style={styles.errorText}>{exportError}</Text>}
        {exportData && (
          <View style={styles.result}>
            <Text style={styles.successText}>Export ready ({new Date(exportData.generated_at).toLocaleString()})</Text>
            {summarizeExport(exportData).map(([name, count]) => (
              <Text key={name} style={styles.rowText}>
                {humanize(name)}: {count}
              </Text>
            ))}
            {exportData._errors.length > 0 && (
              <Text style={styles.warnText}>
                Some sections were unavailable: {exportData._errors.map((e) => e.split(':')[0]).join(', ')}.
              </Text>
            )}
            <Pressable style={[styles.button, styles.secondary]} onPress={handleShareExport} accessibilityRole="button">
              <Text style={styles.secondaryText}>Share / save JSON</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Rectify */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Correct my data</Text>
        <Text style={styles.body}>
          Tell us which information is wrong. Requests are logged and answered within 30 days.
        </Text>
        <Text style={styles.label}>Field *</Text>
        <TextInput style={styles.input} value={field} onChangeText={setField} maxLength={120}
          placeholder="e.g. Name" placeholderTextColor={theme.text.muted} />
        <Text style={styles.label}>Current value</Text>
        <TextInput style={styles.input} value={currentValue} onChangeText={setCurrentValue} maxLength={2000}
          placeholderTextColor={theme.text.muted} />
        <Text style={styles.label}>Correct value *</Text>
        <TextInput style={styles.input} value={requestedValue} onChangeText={setRequestedValue} maxLength={2000}
          placeholderTextColor={theme.text.muted} />
        <Text style={styles.label}>Reason</Text>
        <TextInput style={[styles.input, styles.multiline]} value={reason} onChangeText={setReason} maxLength={2000}
          multiline placeholderTextColor={theme.text.muted} />
        <Pressable
          style={[styles.button, !canSubmitRectify && styles.disabled]}
          onPress={handleRectify}
          disabled={!canSubmitRectify}
          accessibilityRole="button"
        >
          {busy === 'rectify' ? (
            <ActivityIndicator color={theme.text.inverse} />
          ) : (
            <Text style={styles.buttonText}>Submit correction request</Text>
          )}
        </Pressable>
        {rectifyMessage && (
          <Text style={rectifyMessage.ok ? styles.successText : styles.errorText}>{rectifyMessage.text}</Text>
        )}
      </View>

      {/* Delete */}
      <View style={[styles.card, styles.dangerCard]}>
        <Text style={styles.cardTitle}>Delete my account</Text>
        {!preview ? (
          <>
            <Text style={styles.body}>
              Step 1 of 2. First review exactly what would be deleted. Nothing is deleted yet.
            </Text>
            <Pressable
              style={[styles.button, styles.secondary, busy !== null && styles.disabled]}
              onPress={handlePreviewDeletion}
              disabled={busy !== null}
              accessibilityRole="button"
            >
              {busy === 'preview' ? (
                <ActivityIndicator color={theme.accent.indigo} />
              ) : (
                <Text style={styles.secondaryText}>Review what will be deleted</Text>
              )}
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.body}>Step 2 of 2. This will permanently remove:</Text>
            {Object.entries(preview.will_delete).map(([table, count]) => (
              <Text key={table} style={styles.rowText}>
                {humanize(table)}: {count} {count === 1 ? 'record' : 'records'}
              </Text>
            ))}
            {clerkNote && <Text style={styles.rowText}>sign-in account: {clerkNote}</Text>}
            {retained.length > 0 && (
              <>
                <Text style={[styles.label, styles.retainedLabel]}>Retained</Text>
                {retained.map(([system, why]) => (
                  <Text key={system} style={styles.rowText}>
                    {humanize(system)}: {why}
                  </Text>
                ))}
              </>
            )}
            <Pressable
              style={[styles.button, styles.destructive, busy !== null && styles.disabled]}
              onPress={handleConfirmDeletion}
              disabled={busy !== null}
              accessibilityRole="button"
            >
              {busy === 'delete' ? (
                <ActivityIndicator color={theme.text.inverse} />
              ) : (
                <Text style={styles.buttonText}>Permanently delete my account</Text>
              )}
            </Pressable>
            <Pressable
              style={styles.cancelLink}
              onPress={() => resetDeletion(null)}
              disabled={busy !== null}
              accessibilityRole="button"
            >
              <Text style={styles.linkText}>Cancel</Text>
            </Pressable>
          </>
        )}
        {deleteError && <Text style={styles.errorText}>{deleteError}</Text>}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg.base },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  backRow: { paddingVertical: spacing.sm },
  backText: { color: theme.accent.indigo, fontSize: 14 },
  title: { fontSize: 22, fontWeight: '700', color: theme.text.primary, marginBottom: spacing.lg },
  card: {
    backgroundColor: theme.bg.surface,
    borderRadius: radius.lg,
    borderColor: theme.border.subtle,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  dangerCard: { borderColor: theme.accent.red },
  cardTitle: { fontSize: 16, fontWeight: '600', color: theme.text.primary, marginBottom: spacing.sm },
  body: { fontSize: 13, color: theme.text.secondary, lineHeight: 19, marginBottom: spacing.md },
  label: {
    fontSize: 11,
    color: theme.text.muted,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  retainedLabel: { marginTop: spacing.lg },
  input: {
    backgroundColor: theme.bg.elevated,
    borderColor: theme.border.subtle,
    borderWidth: 1,
    borderRadius: radius.md,
    color: theme.text.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
  },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  button: {
    backgroundColor: theme.accent.indigo,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  buttonText: { color: theme.text.inverse, fontSize: 14, fontWeight: '600' },
  secondary: { backgroundColor: 'transparent', borderColor: theme.accent.indigo, borderWidth: 1 },
  secondaryText: { color: theme.accent.indigo, fontSize: 14, fontWeight: '600' },
  destructive: { backgroundColor: theme.accent.red },
  disabled: { opacity: 0.5 },
  cancelLink: { alignItems: 'center', paddingVertical: spacing.md },
  linkText: { color: theme.accent.indigo, fontSize: 14 },
  result: { marginTop: spacing.md },
  rowText: { fontSize: 13, color: theme.text.primary, marginBottom: spacing.xs },
  successText: { fontSize: 13, color: theme.accent.green, marginTop: spacing.md, marginBottom: spacing.xs },
  warnText: { fontSize: 12, color: theme.accent.yellow, marginTop: spacing.sm },
  errorText: { fontSize: 13, color: theme.accent.red, marginTop: spacing.md },
});
