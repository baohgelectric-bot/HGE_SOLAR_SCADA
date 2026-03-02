import { create } from 'zustand';
import { FilterType } from '@/config/constants';
import type { FilterState } from '@/types/scada.types';

export const useFilterStore = create<FilterState>((set) => ({
    filterType: FilterType.DAY,
    selectedDate: new Date(),
    compareMode: false,

    setFilterType: (filterType: FilterType) => set({ filterType }),
    setSelectedDate: (selectedDate: Date) => set({ selectedDate }),
    toggleCompareMode: () =>
        set((state) => ({ compareMode: !state.compareMode })),
}));
