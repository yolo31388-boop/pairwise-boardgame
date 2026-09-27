
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

describe('引擎不变量（新增）', () => {
  test('严格回合顺序：三人轮转顺序固定', () => {
    const ps = [new Player(1), new Player(2), new Player(3)];
    const tm = new TurnManager(ps);
    const order = [];
    for (let i = 0; i < 6; i++) { tm.startTurn(); order.push(tm.currentPlayer().id); tm.endTurn(); }
    expect(order).toEqual([1, 2, 3, 1, 2, 3]);
  });
  test('非当前玩家操作被拒且不生效不排队', () => {
    const p1 = new Player(1); const p2 = new Player(2);
    const card = { cost: 0, name: 'x' };
    p2.hand.push(card);
    const tm = new TurnManager([p1, p2]);
    tm.startTurn();
    expect(() => tm.playCard(2, card)).toThrow('非当前玩家');
    expect(p2.hand.length).toBe(1);
    tm.endTurn(); tm.startTurn();
    expect(p2.hand.length).toBe(1);
  });
  test('回合开始初始化行动点/抽牌/可用技能', () => {
    const p1 = new Player(1);
    p1.skills = ['fire', 'heal'];
    p1.deck = ['c1'];
    const tm = new TurnManager([p1]);
    tm.startTurn();
    expect(p1.actionPoints).toBe(p1.maxActionPoints);
    expect(p1.hand).toContain('c1');
    expect(p1.availableSkills).toEqual(['fire', 'heal']);
  });
  test('回合结束清理不残留到下一回合', () => {
    const p1 = new Player(1); const p2 = new Player(2);
    const tm = new TurnManager([p1, p2]);
    tm.startTurn();
    p1.tempEffects.push('buff');
    p1.actionPoints = 1;
    tm.endTurn();
    expect(p1.tempEffects).toEqual([]);
    expect(p1.actionPoints).toBe(0);
    tm.startTurn();
    expect(p2.tempEffects).toEqual([]);
  });
  test('跳过回合触发完整结束逻辑', () => {
    const p1 = new Player(1); const p2 = new Player(2);
    const tm = new TurnManager([p1, p2]);
    tm.startTurn();
    p1.tempEffects.push('buff');
    tm.skipTurn(1);
    expect(p1.tempEffects).toEqual([]);
    expect(tm.isCurrentPlayer(2)).toBe(true);
    expect(() => tm.skipTurn(1)).toThrow();
  });
  test('回合数只在完整轮次后递增且不回退', () => {
    const p1 = new Player(1); const p2 = new Player(2);
    const tm = new TurnManager([p1, p2]);
    tm.startTurn(); tm.endTurn();
    expect(tm.turn).toBe(1);
    tm.startTurn(); tm.endTurn();
    expect(tm.turn).toBe(2);
    tm.startTurn(); tm.endTurn();
    expect(tm.turn).toBe(2);
    tm.startTurn(); tm.endTurn();
    expect(tm.turn).toBe(3);
  });
  test('胜利条件在操作后立即检查', () => {
    const p1 = new Player(1); const p2 = new Player(2);
    const tm = new TurnManager([p1, p2]);
    tm.startTurn();
    const winCard = { cost: 0, effect: (me) => { me.victoryPoints = 10; } };
    p1.hand.push(winCard);
    tm.playCard(1, winCard);
    expect(tm.winner).toBe(p1);
    expect(tm.gameOver).toBe(true);
    expect(() => tm.playCard(1, winCard)).toThrow('游戏已结束');
  });
  test('淘汰胜利实时生效', () => {
    const p1 = new Player(1); const p2 = new Player(2);
    const tm = new TurnManager([p1, p2]);
    tm.startTurn();
    const kill = { cost: 0, effect: (me, game) => { game.players[1].alive = false; } };
    p1.hand.push(kill);
    tm.playCard(1, kill);
    expect(tm.winner).toBe(p1);
  });
  test('费用不足原子失败：不扣点不移牌', () => {
    const p1 = new Player(1);
    const tm = new TurnManager([p1]);
    tm.startTurn();
    const expensive = { cost: 99, name: 'big' };
    p1.hand.push(expensive);
    const ap = p1.actionPoints;
    expect(tm.playCard(1, expensive)).toBe(false);
    expect(p1.actionPoints).toBe(ap);
    expect(p1.hand).toContain(expensive);
    expect(p1.discardPile).not.toContain(expensive);
  });
  test('弃牌抽牌守恒：洗回不丢失不重复', () => {
    const h = new Hand();
    h.deck = ['a', 'b'];
    h.discard = ['c', 'd', 'e'];
    const drawn = [h.draw(), h.draw(), h.draw(), h.draw(), h.draw()];
    expect(new Set(drawn).size).toBe(5);
    expect([...drawn].sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(h.deck.length + h.discard.length).toBe(0);
    expect(h.draw()).toBeUndefined();
  });
  test('效果完整结算后才允许下一操作', () => {
    const p1 = new Player(1); const p2 = new Player(2);
    const tm = new TurnManager([p1, p2]);
    tm.startTurn();
    const steps = [];
    let reentrantError = null;
    const card = { cost: 1, effect: (me, game) => {
      steps.push('start');
      try { game.playCard(2, { cost: 0 }); } catch (e) { reentrantError = e; }
      steps.push('end');
    } };
    p1.hand.push(card);
    expect(tm.playCard(1, card)).toBe(true);
    expect(steps).toEqual(['start', 'end']);
    expect(reentrantError).not.toBeNull();
    expect(tm.locked).toBe(false);
  });
  test('结算中不能结束回合', () => {
    const p1 = new Player(1);
    const tm = new TurnManager([p1]);
    tm.startTurn();
    let err = null;
    const card = { cost: 0, effect: (me, game) => { try { game.endTurn(); } catch (e) { err = e; } } };
    p1.hand.push(card);
    tm.playCard(1, card);
    expect(err).not.toBeNull();
    expect(tm.isCurrentPlayer(1)).toBe(true);
  });
  test('多回合状态连续：行动点每回合重置', () => {
    const p1 = new Player(1); const p2 = new Player(2);
    const tm = new TurnManager([p1, p2]);
    for (let round = 0; round < 3; round++) {
      tm.startTurn();
      expect(p1.actionPoints).toBe(p1.maxActionPoints);
      p1.actionPoints = 0;
      p1.tempEffects.push('x');
      tm.endTurn();
      tm.startTurn();
      expect(p2.actionPoints).toBe(p2.maxActionPoints);
      tm.endTurn();
    }
    expect(tm.turn).toBe(4);
    expect(p1.tempEffects).toEqual([]);
  });
  test('出牌成功扣费并入弃牌堆', () => {
    const p1 = new Player(1);
    const tm = new TurnManager([p1]);
    tm.startTurn();
    const card = { cost: 2, name: 'strike' };
    p1.hand.push(card);
    expect(tm.playCard(1, card)).toBe(true);
    expect(p1.actionPoints).toBe(p1.maxActionPoints - 2);
    expect(p1.hand).not.toContain(card);
    expect(p1.discardPile).toContain(card);
  });
});
