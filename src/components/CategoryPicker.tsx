import { Pressable, View } from 'react-native';
import { Text } from '@/components/Text';
import { useTheme } from '@/features/theme/ThemeContext';
import type { Category } from '@/features/categories/useCategories';
import { CategoryIcon } from './CategoryIcon';

type Props = {
  categories: Category[];
  value: string | null;
  onChange: (id: string | null) => void;
  onAdd?: () => void;
};

export function CategoryPicker({ categories, value, onChange, onAdd }: Props) {
  const C = useTheme();

  if (categories.length === 0) {
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <Text style={{ fontSize: 13, color: C.muted, fontStyle: 'italic' }}>
          No categories yet.
        </Text>
        {onAdd && (
          <Pressable
            onPress={onAdd}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 20,
              borderWidth: 1.5,
              borderColor: C.accent + '50',
              backgroundColor: C.accent + '10',
            }}
          >
            <Text style={{ fontSize: 15, color: C.accent, fontWeight: '700' }}>+</Text>
            <Text style={{ fontSize: 13, fontWeight: '600', color: C.accent }}>Add</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {categories.map((cat) => {
        const active = value === cat.id;
        return (
          <Pressable
            key={cat.id}
            onPress={() => onChange(active ? null : cat.id)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 20,
              borderWidth: 1.5,
              borderColor: active ? C.accent : C.border,
              backgroundColor: active ? C.accent + '15' : C.card,
            }}
          >
            <CategoryIcon icon={cat.icon} color={cat.color} size={20} />
            <Text style={{ fontSize: 13, fontWeight: '500', color: active ? C.accent : C.text }}>
              {cat.name}
            </Text>
          </Pressable>
        );
      })}
      {onAdd && (
        <Pressable
          onPress={onAdd}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderRadius: 20,
            borderWidth: 1.5,
            borderColor: C.accent + '50',
            backgroundColor: C.accent + '10',
          }}
        >
          <Text style={{ fontSize: 15, color: C.accent, fontWeight: '700' }}>+</Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: C.accent }}>Add</Text>
        </Pressable>
      )}
    </View>
  );
}
