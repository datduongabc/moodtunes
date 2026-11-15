import { rankMovement } from '../charts';

describe('rankMovement (AC-13.1.1)', () => {
  it('marks songs that were not in the previous snapshot as new', () => {
    expect(rankMovement(3, null)).toEqual({ kind: 'new', label: 'New' });
  });

  it('compares with the previous rank; a smaller number is a better rank', () => {
    expect(rankMovement(2, 5)).toEqual({ kind: 'up', by: 3, label: 'Up 3' });
    expect(rankMovement(7, 4)).toEqual({ kind: 'down', by: 3, label: 'Down 3' });
    expect(rankMovement(4, 4)).toEqual({ kind: 'same', label: 'Unchanged' });
  });
});
