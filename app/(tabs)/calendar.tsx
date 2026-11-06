import { useCallback, useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Palette, listColor, useTheme } from '@/theme';
import { t, tl } from '@/i18n';
import { useSettings } from '@/AppSettings';
import { ScheduledItem, loadScheduledRange, toggleBought } from '@/logic/shopping';
import { formatDayTitle, todayIso } from '@/logic/dates';
import { buildMonth, dayMarks, groupByList, monthRange } from '@/logic/schedule';
import { ListGroupHeader } from '@/components/ListGroupHeader';
import { ScheduledRow } from '@/components/ScheduledRow';

// «Календарь»: месяц с точками цветом списка, под ним — покупки выбранного дня.
export default function CalendarScreen() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { rememberItems } = useSettings();
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selected, setSelected] = useState(todayIso());
  const [items, setItems] = useState<ScheduledItem[]>([]);
  const today = todayIso();

  const reload = useCallback(async () => {
    const { from, to } = monthRange(cursor.y, cursor.m);
    setItems(await loadScheduledRange(from, to));
  }, [cursor]);
  useFocusEffect(
    useCallback(() => {
      reload().catch((e) => console.warn(e));
    }, [reload]),
  );

  const marks = dayMarks(items.map((i) => ({ date: i.effectiveDate, color: i.listColor })));
  const sections = groupByList(items.filter((i) => i.effectiveDate === selected)).map((g) => ({ key: String(g.listId), listId: g.listId, title: g.title, color: g.color, data: g.items }));
  const openList = (listId: number) => router.push({ pathname: '/list/[id]', params: { id: String(listId) } } as never);
  const weeks = buildMonth(cursor.y, cursor.m);
  const weekdays = [1, 2, 3, 4, 5, 6, 0].map((d) => tl('weekdaysShort')[d]);

  const shift = (delta: number) => {
    const d = new Date(cursor.y, cursor.m + delta, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  };

  const grid = (
    <View>
      <View style={styles.monthRow}>
        <Pressable style={styles.nav} onPress={() => shift(-1)} accessibilityRole="button" accessibilityLabel={t('cal.prev')}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.month}>{tl('months')[cursor.m]} {cursor.y}</Text>
        <Pressable style={styles.nav} onPress={() => shift(1)} accessibilityRole="button" accessibilityLabel={t('cal.next')}>
          <Ionicons name="chevron-forward" size={24} color={colors.text} />
        </Pressable>
      </View>
      <View style={styles.week}>
        {weekdays.map((w) => (
          <Text key={w} style={styles.weekday}>{w}</Text>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.week}>
          {week.map((iso, di) => {
            if (!iso) return <View key={di} style={styles.cell} />;
            const sel = iso === selected;
            const dots = marks.get(iso) ?? [];
            return (
              <Pressable
                key={di}
                style={styles.cell}
                onPress={() => setSelected(iso)}
                accessibilityRole="button"
                accessibilityState={{ selected: sel }}
                accessibilityLabel={formatDayTitle(iso)}
              >
                <View style={[styles.day, sel && styles.daySel, iso === today && !sel && styles.dayToday]}>
                  <Text style={[styles.dayText, sel && styles.dayTextSel]}>{Number(iso.slice(8))}</Text>
                  <View style={styles.dots}>
                    {dots.map((c) => (
                      <View key={c} style={[styles.dotMark, { backgroundColor: sel ? colors.onPrimary : listColor(c, colors.scheme) }]} />
                    ))}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
      <Text style={styles.dayTitle}>{formatDayTitle(selected)}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <SectionList
        sections={sections}
        keyExtractor={(i) => String(i.id)}
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
        renderSectionHeader={({ section }) => (
          <ListGroupHeader title={section.title} color={section.color} count={section.data.length} onPress={() => openList(section.listId)} />
        )}
        ListHeaderComponent={grid}
        ListEmptyComponent={<Text style={styles.empty}>{t('cal.dayEmpty')}</Text>}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16 },
    content: { paddingTop: 8, paddingBottom: 24 },
    monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    nav: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
    month: { color: colors.text, fontSize: 20, fontWeight: '700' },
    week: { flexDirection: 'row' },
    weekday: { flex: 1, textAlign: 'center', color: colors.textMuted, fontSize: 12, paddingBottom: 4 },
    cell: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center' },
    day: { width: 42, height: 44, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
    daySel: { backgroundColor: colors.primary },
    dayToday: { borderWidth: 2, borderColor: colors.primaryStrong },
    dayText: { color: colors.text, fontSize: 15 },
    dayTextSel: { color: colors.onPrimary, fontWeight: '700' },
    dots: { flexDirection: 'row', gap: 2, height: 6, marginTop: 1 },
    dotMark: { width: 5, height: 5, borderRadius: 3 },
    dayTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 14, marginBottom: 8 },
    empty: { color: colors.textMuted, fontSize: 15 },
  });
