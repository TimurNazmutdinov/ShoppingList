import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AccentKey, ApplyScope, Palette, ThemeMode, accentColors, accentKeys, accentNames, brandAccent, radius, useTheme } from '@/theme';
import { iconChange } from '@/logic/schemes';
import { CUSTOM_MAX, CurrencyKind } from '@/logic/money';
import { TextField } from '@/components/FormField';
import { backupAll } from '@/logic/sharing';
import { useImportFlow } from '@/useImportFlow';
import { LanguageSetting, languageNames, languages, t } from '@/i18n';
import { AppSwitch } from '@/components/AppSwitch';
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
  const [open, setOpen] = useState<string | null>(null); // раскрытая группа настроек
  const toggleGroup = (key: string) => setOpen((o) => (o === key ? null : key));
  const [clearOpen, setClearOpen] = useState(false);
  const [pendingIcon, setPendingIcon] = useState<string | null>(null);
  const restoreFlow = useImportFlow(() => {});

  // После смены цвета или охвата: нужна ли смена иконки рабочего стола и спросить ли об этом.
  const applyChoice = (accent: AccentKey, scope: ApplyScope) => {
    if (scope === 'screens' && s.iconDeclined) s.setIconDeclined(false);
    const r = iconChange(scope, accent, s.launcherIcon, scope === 'screens' ? false : s.iconDeclined);
    if (r.ask) setPendingIcon(r.target);
    else if (r.target !== s.launcherIcon) s.setLauncherIcon(r.target);
  };
  const pickAccent = (accent: AccentKey) => {
    s.setAccent(accent);
    applyChoice(accent, s.applyScope);
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
        <Pressable style={styles.groupHeader} onPress={() => toggleGroup('look')} accessibilityRole="button" accessibilityState={{ expanded: open === 'look' }}>
          <Text style={styles.groupTitle}>{t('theme.profile')}</Text>
          <Ionicons name={open === 'look' ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
        </Pressable>
        {open === 'look' ? (
        <View style={styles.block}>
          <Text style={styles.label}>{t('theme.mode')}</Text>
          <View style={styles.segments}>
            {(['light', 'dark', 'system'] as ThemeMode[]).map((m) => {
              const active = s.themeMode === m;
              const label = m === 'light' ? t('theme.modeLight') : m === 'dark' ? t('theme.modeDark') : t('theme.modeSystem');
              return (
                <Pressable
                  key={m}
                  style={[styles.segment, active && styles.segmentActive]}
                  onPress={() => s.setThemeMode(m)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={label}
                >
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.hint, styles.hintPad]}>{t('theme.modeHint')}</Text>

          <Text style={styles.label}>{t('theme.accent')}</Text>
          <View style={styles.dots}>
            {accentKeys.map((k) => {
              const c = accentColors(k, s.mode);
              const selected = s.accent === k;
              const name = accentNames[k][s.language];
              return (
                <Pressable
                  key={k}
                  style={styles.dotCell}
                  onPress={() => pickAccent(k)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={name}
                >
                  <View style={[styles.dot, { backgroundColor: c.accent }, selected && styles.dotSelected]}>
                    {selected ? <Ionicons name="checkmark" size={22} color={c.onAccent} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.hint, styles.hintPad]}>{s.accent === brandAccent ? t('theme.accentBrand') : accentNames[s.accent][s.language]}</Text>

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
                    applyChoice(s.accent, scope);
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
        ) : null}

        <Pressable style={styles.groupHeader} onPress={() => toggleGroup('splash')} accessibilityRole="button" accessibilityState={{ expanded: open === 'splash' }}>
          <Text style={styles.groupTitle}>{t('settings.splash')}</Text>
          <Ionicons name={open === 'splash' ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
        </Pressable>
        {open === 'splash' ? (
          <View style={styles.block}>
            <View style={styles.row}>
              <Ionicons name="sparkles-outline" size={22} color={colors.textMuted} />
              <Text style={styles.rowTitle}>{t('settings.splashShow')}</Text>
              <AppSwitch value={s.showSplash} onValueChange={s.setShowSplash} accessibilityLabel={t('settings.splashShow')} />
            </View>
          </View>
        ) : null}
        <Pressable style={styles.groupHeader} onPress={() => toggleGroup('money')} accessibilityRole="button" accessibilityState={{ expanded: open === 'money' }}>
          <Text style={styles.groupTitle}>{t('settings.currency')}</Text>
          <Ionicons name={open === 'money' ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
        </Pressable>
        {open === 'money' ? (
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
        ) : null}

        <Pressable style={styles.groupHeader} onPress={() => toggleGroup('hints')} accessibilityRole="button" accessibilityState={{ expanded: open === 'hints' }}>
          <Text style={styles.groupTitle}>{t('settings.hints')}</Text>
          <Ionicons name={open === 'hints' ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
        </Pressable>
        {open === 'hints' ? (
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
        ) : null}

        <Pressable style={styles.groupHeader} onPress={() => toggleGroup('updates')} accessibilityRole="button" accessibilityState={{ expanded: open === 'updates' }}>
          <Text style={styles.groupTitle}>{t('settings.updates')}</Text>
          <Ionicons name={open === 'updates' ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
        </Pressable>
        {open === 'updates' ? (
        <View style={styles.block}>
          <Pressable style={styles.row} onPress={() => onCheckNow().catch((e) => console.warn(e))} accessibilityRole="button" accessibilityLabel={`${t('settings.checkNow')}${checkValue ? `: ${checkValue}` : ''}`}>
            <Ionicons name="refresh-outline" size={22} color={colors.textMuted} />
            <Text style={styles.rowTitle}>{t('settings.checkNow')}</Text>
            <Text style={styles.rowValue}>{checkValue ?? ''}</Text>
          </Pressable>
        </View>
        ) : null}

        <Pressable style={styles.groupHeader} onPress={() => toggleGroup('backup')} accessibilityRole="button" accessibilityState={{ expanded: open === 'backup' }}>
          <Text style={styles.groupTitle}>{t('backup.title')}</Text>
          <Ionicons name={open === 'backup' ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
        </Pressable>
        {open === 'backup' ? (
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
        ) : null}
        {restoreFlow.dialog}

        <Pressable style={styles.groupHeader} onPress={() => toggleGroup('about')} accessibilityRole="button" accessibilityState={{ expanded: open === 'about' }}>
          <Text style={styles.groupTitle}>{t('settings.about')}</Text>
          <Ionicons name={open === 'about' ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
        </Pressable>
        {open === 'about' ? (
        <View style={[styles.block, styles.lastBlock]}>
          <Text style={styles.version}>
            {t(IS_PROTOTYPE ? 'settings.versionProto' : 'settings.version', { version: appVersion, code: appVersionCodeLabel })}
          </Text>
        </View>
        ) : null}
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
    groupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, marginTop: 10 },
    groupTitle: { color: colors.primaryStrong, fontSize: 15, fontWeight: '700' },
    section: { color: colors.primaryStrong, fontSize: 14, fontWeight: '700', marginTop: 22, marginBottom: 8 },
    // Группа настроек: один блок с рамкой, строки внутри разделены линией.
    block: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radius.card, overflow: 'hidden' },
    lastBlock: { marginBottom: 32 },
    divider: { borderTopWidth: 1, borderTopColor: colors.cardBorder },
    label: { color: colors.textMuted, fontSize: 14, marginTop: 14, marginBottom: 8, paddingHorizontal: 14 },
    hint: { color: colors.textMuted, fontSize: 13, marginTop: 4, flexShrink: 1 },
    hintPad: { paddingHorizontal: 14, paddingBottom: 14 },
    fieldPad: { paddingHorizontal: 14, paddingBottom: 14 },
    // 8 цветов: 4 в ряд, 2 ряда; выбранный — с галочкой и кольцом
    dots: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14 },
    dotCell: { width: '25%', height: 56, alignItems: 'center', justifyContent: 'center' },
    dot: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'transparent' },
    dotSelected: { borderColor: colors.text },
    segments: { flexDirection: 'row', backgroundColor: colors.cardStrong, borderRadius: radius.button, padding: 4, gap: 4, marginHorizontal: 14, marginBottom: 14 },
    segmentsTop: { marginTop: 14 },
    segment: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderRadius: radius.button - 3 },
    segmentActive: { backgroundColor: colors.tonal },
    segmentText: { color: colors.text, fontSize: 14, textAlign: 'center' },
    segmentTextActive: { color: colors.onTonal, fontWeight: '600' },
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
