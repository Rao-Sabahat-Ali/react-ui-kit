import { screen, within } from '@testing-library/react';
import type { Column } from './types';

export interface Person {
  id: number;
  name: string;
  team: string;
  score: number | null;
  joined: Date;
}

export const people: Person[] = [
  { id: 1, name: 'Anna', team: 'Red', score: 10, joined: new Date(2024, 0, 15, 9) },
  { id: 2, name: 'Björn', team: 'Blue', score: 25, joined: new Date(2024, 1, 1, 18) },
  { id: 3, name: 'Carla', team: 'Red', score: 40, joined: new Date(2024, 2, 10) },
  { id: 4, name: 'Dan', team: 'Green', score: null, joined: new Date(2024, 0, 15, 23) },
  { id: 5, name: 'Élodie', team: 'Blue', score: 25, joined: new Date(2023, 11, 31) },
];

export const personColumns: Column<Person>[] = [
  { field: 'name', header: 'Name', sortable: true, filterable: true },
  { field: 'team', header: 'Team', filterable: true, filterType: 'select', filterOptions: ['Red', 'Blue', 'Green'].map((v) => ({ label: v, value: v })) },
  { field: 'score', header: 'Score', align: 'end', sortable: true, filterable: true, filterType: 'number' },
  { field: 'joined', header: 'Joined', filterable: true, filterType: 'date' },
];

/** Body rows of the (first) native table. */
export const bodyRows = () => within(document.querySelector('tbody')!).queryAllByRole('row').filter((r) => !r.classList.contains('ui-data-table__empty'));
export const firstCells = () => bodyRows().map((r) => r.querySelector('td')?.textContent ?? '');
export const names = () => bodyRows().map((r) => r.querySelector('[data-col="name"]')?.textContent ?? '');
export const header = (name: string) => screen.getByRole('columnheader', { name: new RegExp(name) });
