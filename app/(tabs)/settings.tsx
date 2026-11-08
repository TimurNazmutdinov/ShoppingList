import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ApplyScope, Palette, SchemeSetting, darkSchemeKeys, lightSchemeKeys, radius, useTheme } from '@/theme';
import { iconChange } from '@/logic/schemes';
import { CUSTOM_MAX, CurrencyKind } from '@/logic/money';
import { TextField } from '@/components/FormField';
import { backupAll } from '@/logic/sharing';
import { useImportFlow } from '@/useImportFlow';
import { LanguageSetting, languageNames, languages, t } from '@/i18n';
import { AppSwitch } from '@/components/AppSwitch';
import { SchemeThumb } from '@/components/SchemeThumb';
import { ScreenHeader } from '@/components/ScreenHeader';
import { BottomSheet } from '@/components/BottomSheet';
import { useSettings } from '@/AppSettings';
import { loadReminderSettings } from '@/db/reminders';
import { reminderSummary } from '@/logic/reminders';
import { getPermissionState } from '@/notifications';
import { clearHistory } from '@/logic/shopping';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useUpdates } from '@/Updates';
import { IS_PROTOTYPE } from '@/config';
import { appVersion, appVersionCodeLabel } from '@/version';

export default function SettingsScreen() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const s = useSettings();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [pendingIcon, setPendingIcon] = useState<string | null>(null);
  const restoreFlow = useImportFlow(() => {});

  // После смены профиля или охвата: нужна ли смена иконки рабочего стола и спросить ли об этом.
  const applyChoice = (setting: SchemeSetting, scope: ApplyScope) => {
    if (scope === 'screens' && s.iconDeclined) s.setIconDeclined(false);
    const r = iconChange(scope, setting, s.launcherIcon, scope === 'screens' ? false : s.iconDeclined);
    if (r.ask) setPendingIcon(r.target);
    else if (r.target !== s.launcherIcon) s.setLauncherIcon(r.target);
  };
  const pickScheme = (setting: SchemeSetting) => {
    s.setSchemeSetting(setting);
    applyChoice(setting, s.applyScope);
  };
  const { checkNow } = useUpdates();
  const [checkValue, setCheckValue] = useState<string | null>(null);

  const onCheckNow = async () => {
    setCheckValue(t('update.checking'));
    const result = await checkNow();
    // Если версия новее, поверх всего откроется экран обновления.
    if (result.status === 'latest') setCheckValue(t('update.latest', { version: result.version }));
    else if (result.status === 'error') setCheckValue(t('update.failed'));
    else setCheckValue(null);
  };
  const router = useRouter();
  const [remindersValue, setRemindersValue] = useState('');

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setRemindersValue(reminderSummary(await loadReminderSettings(), (await getPermissionState()) === 'granted'));
      })().catch((e) => console.warn(e));
    }, []),
  );

  const langLabel = s.languageSetting === 'system' ? t('language.system') : languageNames[s.language];
  const langOptions: { value: LanguageSetting; title: string }[] = [
    { value: 'system', title: t('language.system') },
    ...languages.map((l) => ({ value: l, title: languageNames[l] })),
  ];

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScreenHeader title={t('settings.title')} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.section}>{t('theme.profile')}</Text>
        <View style={styles.block}>
          <Pressable
            style={styles.row}
            onPress={() => pickScheme('system')}
            accessibilityRole="radio"
            accessibilityState={{ selected: s.schemeSetting === 'system' }}
            accessibilityLabel={t('theme.system')}
          >
            <Ionicons name="phone-portrait-outline" size={22} color={colors.textMuted} />
            <View style={styles.rowBody}>
              <Text style={styles.rowTitleText}>{t('theme.system')}</Text>
              <Text style={styles.hint}>{t('theme.systemHint')}</Text>
            </View>
            {s.schemeSetting === 'system' ? <Ionicons name="checkmark-circle" size={24} color={colors.primaryStrong} /> : null}
          </Pressable>

          <Text style={styles.label}>{t('theme.light')}</Text>
          <View style={styles.grid}>
            {lightSchemeKeys.map((k) => (
              <SchemeThumb key={k} schemeKey={k} selected={s.schemeSetting === k} onPress={() => pickScheme(k)} />
            ))}
          </View>
          <Text style={styles.label}>{t('theme.dark')}</Text>
          <View style={styles.grid}>
            {darkSchemeKeys.map((k) => (
              <SchemeThumb key={k} schemeKey={k} selected={s.schemeSetting === k} onPress={() => pickScheme(k)} />
            ))}
          </View>

          <Text style={styles.label}>{t('theme.scope')}</Text>
          <View style={styles.segments}>
            {(['screens', 'all'] as ApplyScope[]).map((scope) => {
              const active = s.applyScope === scope;
              const label = scope === 'all' ? t('theme.scopeAll') : t('theme.scopeScreens');
              return (
                <Pressable
                  key={scope}
                  style={[styles.segment, active && styles.segmentActive]}
                  onPress={() => {
                    s.setApplyScope(scope);
                    applyChoice(s.schemeSetting, scope);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={label}
                >
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>

          {s.applyScope === 'all' && s.iconDeclined ? <Text style={[styles.hint, styles.hintPad]}>{t('theme.iconBrand')}</Text> : null}
        </View>

        <Text style={styles.section}>{t('settings.currency')}</Text>
        <View style={styles.block}>
          <View style={[styles.segments, styles.segmentsTop]}>
            {(['KZT', 'RUB', 'CUSTOM'] as CurrencyKind[]).map((kind) => {
              const active = s.currency.kind === kind;
              const label = kind === 'KZT' ? '₸' : kind === 'RUB' ? '₽' : t('currency.custom');
              return (
                <Pressable
                  key={kind}
                  style={[styles.segment, active && styles.segmentActive]}
                  onPress={() => s.setCurrency({ ...s.currency, kind })}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={label}
                >
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
          {s.currency.kind === 'CUSTOM' ? (
            <View style={styles.fieldPad}>
              <TextField
                value={s.currency.custom}
                onChangeText={(custom) => s.setCurrency({ kind: 'CUSTOM', custom })}
                placeholder={t('currency.customPlaceholder')}
                maxLength={CUSTOM_MAX}
                accessibilityLabel={t('currency.customPlaceholder')}
              />
            </View>
          ) : null}

          <Pressable
            style={[styles.row, styles.divider]}
            onPress={() => setSheetOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`${t('settings.language')}: ${langLabel}`}
          >
            <Ionicons name="language-outline" size={22} color={colors.textMuted} />
            <Text style={styles.rowTitle}>{t('settings.language')}</Text>
            <Text style={styles.rowValue}>{langLabel}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>

          <Pressable
            style={[styles.row, styles.divider]}
            onPress={() => router.push('/reminders' as never)}
            accessibilityRole="button"
            accessibilityLabel={`${t('reminders.title')}: ${remindersValue}`}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.textMuted} />
            <Text style={styles.rowTitle}>{t('reminders.title')}</Text>
            <Text style={styles.rowValue}>{remindersValue}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        </View>

        <Text style={styles.section}>{t('settings.hints')}</Text>
        <View style={styles.block}>
          <View style={styles.row}>
            <Ionicons name="bulb-outline" size={22} color={colors.textMuted} />
            <View style={styles.rowBody}>
              <Text style={styles.rowTitleText}>{t('settings.remember')}</Text>
              <Text style={styles.hint}>{t('settings.rememberHint')}</Text>
            </View>
            <AppSwitch value={s.rememberItems} onValueChange={s.setRememberItems} accessibilityLabel={t('settings.remember')} />
          </View>

          <Pressable style={[styles.row, styles.divider]} onPress={() => setClearOpen(true)} accessibilityRole="button" accessibilityLabel={t('settings.clearHistory')}>
            <Ionicons name="trash-outline" size={22} color={colors.textMuted} />
            <Text style={styles.rowTitle}>{t('settings.clearHistory')}</Text>
          </Pressable>
        </View>

        <Text style={styles.section}>{t('settings.updates')}</Text>
        <View style={styles.block}>
          <Pressable style={styles.row} onPress={() => onCheckNow().catch((e) => console.warn(e))} accessibilityRole="button" accessibilityLabel={`${t('settings.checkNow')}${checkValue ? `: ${checkValue}` : ''}`}>
            <Ionicons name="refresh-outline" size={22} color={colors.textMuted} />
            <Text style={styles.rowTitle}>{t('settings.checkNow')}</Text>
            <Text style={styles.rowValue}>{checkValue ?? ''}</Text>
          </Pressable>
        </View>

        <Text style={styles.section}>{t('backup.title')}</Text>
        <View style={styles.block}>
          <Pressable
            style={styles.row}
            onPress={() =>
              backupAll().catch((e) => {
                console.warn(e);
                Alert.alert(t('share.failed'));
              })
            }
            accessibilityRole="button"
            accessibilityLabel={t('backup.save')}
          >
            <Ionicons name="cloud-upload-outline" size={22} color={colors.textMuted} />
            <View style={styles.rowBody}>
              <Text style={styles.rowTitleText}>{t('backup.save')}</Text>
              <Text style={styles.hint}>{t('backup.saveHint')}</Text>
            </View>
          </Pressable>
          <Pressable style={[styles.row, styles.divider]} onPress={restoreFlow.start} accessibilityRole="button" accessibilityLabel={t('backup.restore')}>
            <Ionicons name="cloud-download-outline" size={22} color={colors.textMuted} />
            <View style={styles.rowBody}>
              <Text style={styles.rowTitleText}>{t('backup.restore')}</Text>
              <Text style={styles.hint}>{t('backup.restoreHint')}</Text>
            </View>
          </Pressable>
        </View>
        {restoreFlow.dialog}

        <Text style={styles.section}>{t('settings.about')}</Text>
        <View style={[styles.block, styles.lastBlock]}>
          <Text style={styles.version}>
            {t(IS_PROTOTYPE ? 'settings.versionProto' : 'settings.version', { version: appVersion, code: appVersionCodeLabel })}
          </Text>
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={pendingIcon !== null}
        title={t('icon.confirmTitle')}
        message={t('icon.confirmText')}
        icon="image-outline"
        cancelLabel={t('icon.keep')}
        confirmLabel={t('icon.change')}
        onCancel={() => {
          s.setIconDeclined(true);
          setPendingIcon(null);
        }}
        onConfirm={() => {
          if (pendingIcon) s.setLauncherIcon(pendingIcon);
          setPendingIcon(null);
        }}
      />
      <ConfirmDialog
        visible={clearOpen}
        title={t('settings.clearHistoryTitle')}
        message={t('settings.clearHistoryText')}
        icon="trash-outline"
        danger
        cancelLabel={t('common.cancel')}
        confirmLabel={t('common.delete')}
        onCancel={() => setClearOpen(false)}
        onConfirm={() => {
          clearHistory().catch((e) => console.warn(e));
          setClearOpen(false);
        }}
      />
      <BottomSheet visible={sheetOpen} onClose={() => setSheetOpen(false)}>
        <Text style={styles.sheetTitle}>Язык / Тіл / Language</Text>
        {langOptions.map((o, i) => {
          const active = s.languageSetting === o.value;
          return (
            <Pressable
              key={o.value}
              style={[styles.option, i > 0 && styles.optionDivider]}
              onPress={() => {
                s.setLanguageSetting(o.value);
                setSheetOpen(false);
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={o.title}
            >
              <Text style={styles.optionTitle}>{o.title}</Text>
              <Ionicons
                name={active ? 'checkmark-circle-outline' : 'ellipse-outline'}
                size={26}
                color={active ? colors.primaryStrong : colors.textMuted}
              />
            </Pressable>
          );
        })}
      </BottomSheet>
    </SafeAreaView>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg, padding: 20, paddingBottom: 0 },
    section: { color: colors.primaryStrong, fontSize: 14, fontWeight: '700', marginTop: 22, marginBottom: 8 },
    // Группа настроек: один блок с рамкой, строки внутри разделены линией.
    block: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radius.card, overflow: 'hidden' },
    lastBlock: { marginBottom: 32 },
    divider: { borderTopWidth: 1, borderTopColor: colors.cardBorder },
    label: { color: colors.textMuted, fontSize: 14, marginTop: 14, marginBottom: 8, paddingHorizontal: 14 },
    hint: { color: colors.textMuted, fontSize: 13, marginTop: 4, flexShrink: 1 },
    hintPad: { paddingHorizontal: 14, paddingBottom: 14 },
    fieldPad: { paddingHorizontal: 14, paddingBottom: 14 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14 },
    segments: { flexDirection: 'row', backgroundColor: colors.cardStrong, borderRadius: radius.button, padding: 4, gap: 4, marginHorizontal: 14, marginBottom: 14 },
    segmentsTop: { marginTop: 14 },
    segment: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderRadius: radius.button - 3 },
    segmentActive: { backgroundColor: colors.primary, borderWidth: 1, borderColor: colors.outline },
    segmentText: { color: colors.text, fontSize: 14, textAlign: 'center' },
    segmentTextActive: { color: colors.onPrimary, fontWeight: '600' },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      minHeight: 56,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    rowBody: { flex: 1 },
    rowTitleText: { color: colors.text, fontSize: 17 },
    rowTitle: { color: colors.text, fontSize: 17, flex: 1 },
    rowValue: { color: colors.textMuted, fontSize: 16, flexShrink: 1, textAlign: 'right' },
    version: { color: colors.textMuted, fontSize: 14, padding: 14 },
    sheetTitle: { color: colors.text, fontSize: 20, fontWeight: '600', marginBottom: 8 },
    option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 56, paddingVertical: 10 },
    optionDivider: { borderTopWidth: 1, borderTopColor: colors.border },
    optionTitle: { color: colors.text, fontSize: 17 },
  });
