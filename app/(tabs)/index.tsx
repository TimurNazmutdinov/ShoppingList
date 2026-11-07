import { useCallback, useMemo, useState } from 'react';
import { SectionList, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Palette, useTheme } from '@/theme';
import { t } from '@/i18n';
import { useSettings } from '@/AppSettings';
import { ScheduledItem, loadDue, toggleBought } from '@/logic/shopping';
import { formatDayTitle, todayIso } from '@/logic/dates';
import { groupByList, splitDue } from '@/logic/schedule';
import { ListGroupHeader } from '@/components/ListGroupHeader';
import { ScheduledRow } from '@/components/ScheduledRow';

// Секция экрана: заголовок дня («Купить сегодня») без товаров или список с его товарами.
type Section =
  | { key: string; kind: 'day'; title: string; data: ScheduledItem[] }
  | { key: string; kind: 'list'; listId: number; title: string; color: string; data: ScheduledItem[] };

// «Сегодня»: что купить сегодня и не купленное с прошлых дней (без упрёков); внутри — по спискам.
export default function TodayScreen() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { rememberItems } = useSettings();
  const [items, setItems] = useState<ScheduledItem[]>([]);
  const today = todayIso();

  const reload = useCallback(async () => setItems(await loadDue(todayIso())), []);
  useFocusEffect(
    useCallback(() => {
      reload().catch((e) => console.warn(e));
    }, [reload]),
  );

  const split = splitDue(items, today);
  const sections: Section[] = [];
  const addBlock = (key: 'today' | 'overdue', title: string, block: ScheduledItem[]) => {
    if (block.length === 0) return;
    sections.push({ key, kind: 'day', title: `${title} · ${block.length}`, data: [] });
    for (const g of groupByList(block)) {
      sections.push({ key: `${key}-${g.listId}`, kind: 'list', listId: g.listId, title: g.title, color: g.color, data: g.items });
    }
  };
  addBlock('today', t('today.buy'), split.today);
  addBlock('overdue', t('today.overdue'), split.overdue);

  const openList = (listId: number) => router.push({ pathname: '/list/[id]', params: { id: String(listId) } } as never);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Text style={styles.title}>{t('today.title')}</Text>
      <Text style={styles.date}>{formatDayTitle(today)}</Text>
      <SectionList
        sections={sections}
        keyExtractor={(i, index) => `${i.id}-${index}`}
        renderItem={({ item }) => (
          <ScheduledRow
            item={item}
            onToggle={(it) => {
              toggleBought(it, rememberItems)
                .then(reload)
                .catch((e) => console.warn(e));
            }}
            onOpen={(it) => openList(it.listId)}
          />
        )}
        renderSectionHeader={({ section }) =>
          section.kind === 'day' ? (
            <Text style={styles.section}>{section.title}</Text>
          ) : (
            <ListGroupHeader title={section.title} color={section.color} onPress={() => openList(section.listId)} />
          )
        }
        ListEmptyComponent={<Text style={styles.empty}>{t('today.empty')}</Text>}
        ListFooterComponent={split.overdue.length > 0 ? <Text style={styles.hint}>{t('today.overdueHint')}</Text> : undefined}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg, padding: 20, paddingBottom: 0 },
    title: { color: colors.text, fontSize: 26, fontWeight: '700' },
    date: { color: colors.textMuted, fontSize: 14, marginTop: 2 },
    content: { paddingTop: 8, paddingBottom: 24 },
    section: { color: colors.primaryStrong, fontSize: 12, fontWeight: '700', letterSpacing: 0.4, marginTop: 16, marginBottom: 2 },
    empty: { color: colors.textMuted, fontSize: 15, marginTop: 24 },
    hint: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 12 },
  });
