import { Pressable, View } from 'react-native';
import { Text } from '@/components/Text';
import type { Category } from '@/features/categories/useCategories';
import { CategoryIcon } from './CategoryIcon';

const C = {
  accent: '#dc2626',
  border: '#2a2a2a',
  card: '#1a1a1a',
  text: '#f9fafb',
  muted: '#9ca3af',
};

type Props = {
  categories: Category[];
  value: string | null;
  onChange: (id: string | null) => void;
};

export function CategoryPicker({ categories, value, onChange }: Props) {
  if (categories.length === 0) {
    return (
      <Text style={{ fontSize: 13, color: C.muted, fontStyle: 'italic' }}>
        No categories yet. Add some in Budgets.
      </Text>
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
    </View>
  );
}
