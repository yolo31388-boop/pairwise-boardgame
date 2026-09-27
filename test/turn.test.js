
const { TurnManager } = require('../src/game/turnManager.js');
const { Player } = require('../src/game/player.js');
const { Hand } = require('../src/cards/hand.js');

describe('桌游回合制', () => {
  test('严格回合顺序', () => {
    const p1 = new Player(1); const p2 = new Player(2);
    const tm = new TurnManager([p1, p2]);
    tm.startTurn();
    expect(tm.isCurrentPlayer(1)).toBe(true);
    tm.endTurn();
    expect(tm.isCurrentPlayer(2)).toBe(true);
  });
  test('非当前玩家操作被拒', () => {
    const p1 = new Player(1); const p2 = new Player(2);
    const tm = new TurnManager([p1, p2]);
    tm.startTurn();
    expect(() => tm.playCard(2, 'card')).toThrow();
  });
  test('回合开始初始化', () => {
    const p1 = new Player(1);
    const tm = new TurnManager([p1]);
    tm.startTurn();
    expect(p1.actionPoints).toBeGreaterThan(0);
  });
  test('回合结束清理', () => {
    const p1 = new Player(1);
    p1.tempEffects.push('buff');
    const tm = new TurnManager([p1]);
    tm.startTurn();
    tm.endTurn();
    expect(p1.tempEffects.length).toBe(0);
  });
  test('回合数递增', () => {
    const p1 = new Player(1); const p2 = new Player(2);
    const tm = new TurnManager([p1, p2]);
    tm.startTurn(); tm.endTurn();
    tm.startTurn(); tm.endTurn();
    expect(tm.turn).toBe(2);
  });
  test('费用不足原子失败', () => {
    const p1 = new Player(1);
    p1.actionPoints = 0;
    p1.hand.push({cost: 2, name: 'test'});
    expect(p1.playCard({cost: 2, name: 'test'})).toBe(false);
    expect(p1.hand.length).toBe(1);
  });
  test('弃牌洗回不丢失', () => {
    const h = new Hand();
    h.discard = ['a', 'b', 'c'];
    const c1 = h.draw();
    expect(c1).toBeDefined();
    expect(h.discard.length).toBe(0);
  });
});
