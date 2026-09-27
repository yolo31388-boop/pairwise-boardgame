
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

describe('回合制不变量（新增）', () => {
  const mkCard = (name, cost, extra = {}) => ({ name, cost, ...extra });

  test('严格回合顺序：当前玩家可操作，结束后才轮到下一玩家', () => {
    const p1 = new Player(1); const p2 = new Player(2); const p3 = new Player(3);
    const tm = new TurnManager([p1, p2, p3]);
    tm.startTurn();
    p1.hand.push(mkCard('strike', 1));
    expect(tm.playCard(1, 'strike')).toBeTruthy();
    expect(() => tm.playCard(2, mkCard('x', 0))).toThrow();
    tm.endTurn();
    tm.startTurn();
    expect(tm.isCurrentPlayer(2)).toBe(true);
    p2.hand.push(mkCard('guard', 0));
    expect(tm.playCard(2, 'guard')).toBeTruthy();
    expect(() => tm.playCard(3, mkCard('x', 0))).toThrow();
    tm.endTurn();
    expect(tm.isCurrentPlayer(3)).toBe(true);
  });

  test('非当前玩家操作被即时拒绝，不排队也不产生任何效果', () => {
    const p1 = new Player(1); const p2 = new Player(2);
    p2.hand.push(mkCard('fireball', 0));
    p2.hp = 5;
    const tm = new TurnManager([p1, p2]);
    tm.startTurn();
    expect(() => tm.playCard(2, 'fireball', () => { p1.hp -= 99; })).toThrow();
    expect(p1.hp).toBe(30);
    expect(p2.hand.length).toBe(1);
    expect(p2.actionPoints).toBe(0);
  });

  test('回合开始时初始化行动点、抽牌与可用技能', () => {
    const deck = new Hand();
    deck.deck.push(mkCard('c1', 1), mkCard('c2', 1), mkCard('c3', 1));
    const p1 = new Player(1);
    const tm = new TurnManager([p1], { deck, drawCount: 2 });
    tm.startTurn();
    expect(p1.actionPoints).toBe(3);
    expect(p1.hand.length).toBe(2);
    expect(deck.deck.length).toBe(1);
    p1.usedSkills.heal = true;
    tm.endTurn();
    tm.startTurn();
    expect(p1.usedSkills.heal).toBeUndefined();
    expect(p1.actionPoints).toBe(3);
    expect(p1.hand.length).toBe(3);
  });

  test('回合结束清理临时状态，AP/临时效果不残留', () => {
    const p1 = new Player(1);
    const tm = new TurnManager([p1]);
    tm.startTurn();
    p1.actionPoints -= 2;
    p1.tempEffects.push('rage');
    tm.endTurn();
    expect(p1.actionPoints).toBe(0);
    expect(p1.tempEffects.length).toBe(0);
    expect(tm.active).toBe(false);
    expect(() => tm.playCard(1, mkCard('x', 0))).toThrow();
  });

  test('跳过回合必须走完整回合结束逻辑（清理+推进+递增）', () => {
    const p1 = new Player(1); const p2 = new Player(2);
    const tm = new TurnManager([p1, p2]);
    tm.startTurn();
    p1.tempEffects.push('shield');
    expect(() => tm.skipTurn(2)).toThrow();
    tm.skipTurn(1);
    expect(p1.tempEffects.length).toBe(0);
    expect(p1.actionPoints).toBe(0);
    expect(tm.isCurrentPlayer(2)).toBe(true);
    expect(tm.active).toBe(false);
  });

  test('回合数严格递增：回合一整圈+1，不重复不回退', () => {
    const p1 = new Player(1); const p2 = new Player(2);
    const tm = new TurnManager([p1, p2]);
    const rounds = [tm.turn];
    tm.startTurn(); tm.endTurn();
    tm.startTurn(); tm.endTurn();
    rounds.push(tm.turn);
    tm.startTurn(); tm.endTurn();
    tm.startTurn(); tm.endTurn();
    rounds.push(tm.turn);
    expect(rounds).toEqual([1, 2, 3]);
    expect(() => tm.endTurn()).toThrow();
    expect(tm.turn).toBe(3);
  });

  test('胜利条件在每次操作后实时检查，而非等回合结束', () => {
    const p1 = new Player(1); const p2 = new Player(2);
    p2.hp = 2;
    const tm = new TurnManager([p1, p2]);
    tm.startTurn();
    p1.hand.push(mkCard('assassinate', 1));
    tm.playCard(1, 'assassinate', () => { p2.hp = 0; });
    expect(tm.over).toBe(true);
    expect(tm.winner).toBe(1);
    expect(() => tm.playCard(1, mkCard('x', 0))).toThrow();
    expect(() => tm.endTurn()).toThrow();
  });

  test('自定义胜利判定同样在操作后立即生效', () => {
    const p1 = new Player(1); const p2 = new Player(2);
    let score = 0;
    const tm = new TurnManager([p1, p2], {
      victoryCheck: () => (score >= 10 ? 2 : null),
    });
    tm.startTurn();
    p1.hand.push(mkCard('grant', 0));
    tm.playCard(1, 'grant', () => { score = 10; });
    expect(tm.winner).toBe(2);
    expect(tm.over).toBe(true);
  });

  test('费用不足时原子失败：不扣AP、不弃牌、效果不执行', () => {
    const p1 = new Player(1); const p2 = new Player(2);
    const deck = new Hand();
    const tm = new TurnManager([p1, p2], { deck });
    tm.startTurn();
    p1.hand.push(mkCard('expensive', 5));
    const apBefore = p1.actionPoints;
    let effectRan = false;
    expect(tm.playCard(1, 'expensive', () => { effectRan = true; })).toBe(false);
    expect(p1.actionPoints).toBe(apBefore);
    expect(p1.hand.length).toBe(1);
    expect(deck.discard.length).toBe(0);
    expect(effectRan).toBe(false);
  });

  test('效果中途抛错时回滚已扣除的费用与卡牌，操作原子失败', () => {
    const p1 = new Player(1);
    const deck = new Hand();
    const tm = new TurnManager([p1], { deck });
    tm.startTurn();
    p1.hand.push(mkCard('doom', 2));
    expect(() =>
      tm.playCard(1, 'doom', () => { throw new Error('effect interrupted'); }),
    ).toThrow('effect interrupted');
    expect(p1.hand.length).toBe(1);
    expect(p1.actionPoints).toBe(3);
    expect(deck.discard.length).toBe(0);
    expect(tm.locked).toBe(false);
    p1.hand.push(mkCard('safe', 1));
    expect(tm.playCard(1, 'safe')).toBeTruthy();
  });

  test('弃牌堆与抽牌堆正确维护：打出进弃牌堆，洗回不丢不重', () => {
    const cards = Array.from({ length: 5 }, (_, i) => mkCard('c' + i, 0));
    const deck = new Hand(cards.slice());
    deck.deck = cards.slice();
    const seen = [];
    for (let i = 0; i < 5; i++) {
      seen.push(deck.draw());
      deck.discardCard(seen[i]);
    }
    expect(deck.deck.length).toBe(0);
    expect(deck.discard.length).toBe(5);
    const redrawn = [];
    for (let i = 0; i < 5; i++) redrawn.push(deck.draw());
    expect(new Set(redrawn).size).toBe(5);
    expect(redrawn.sort((a, b) => a.name.localeCompare(b.name)))
      .toEqual(cards.sort((a, b) => a.name.localeCompare(b.name)));
    expect(deck.discard.length).toBe(0);
  });

  test('效果必须完整结算后才允许下一个操作（结算期间重入被拒）', () => {
    const p1 = new Player(1); const p2 = new Player(2);
    const tm = new TurnManager([p1, p2]);
    tm.startTurn();
    p1.hand.push(mkCard('nested', 1), mkCard('inner', 0));
    expect(() =>
      tm.playCard(1, 'nested', () => {
        expect(tm.locked).toBe(true);
        expect(() => tm.playCard(1, 'inner')).toThrow();
      }),
    ).not.toThrow();
    expect(tm.locked).toBe(false);
    expect(tm.playCard(1, 'inner')).toBeTruthy();
  });

  test('多回合状态连续：打出的牌进弃牌堆且下回合AP重置', () => {
    const p1 = new Player(1); const p2 = new Player(2);
    const deck = new Hand();
    const tm = new TurnManager([p1, p2], { deck });
    tm.startTurn();
    p1.hand.push(mkCard('bolt', 2));
    tm.playCard(1, 'bolt');
    expect(p1.actionPoints).toBe(1);
    expect(deck.discard.length).toBe(1);
    tm.endTurn();
    expect(p1.actionPoints).toBe(0);
    tm.startTurn();
    expect(p2.actionPoints).toBe(3);
    expect(p2.hand.length).toBe(1);
    tm.endTurn();
    tm.startTurn();
    expect(tm.currentPlayer().id).toBe(1);
    expect(p1.actionPoints).toBe(3);
    expect(p1.hand.length).toBe(0);
    // 打出的那张牌在 p2 回合空牌堆时被洗回并抽到手中：卡牌守恒，不丢失
    expect(deck.deck.length + deck.discard.length + p1.hand.length + p2.hand.length).toBe(1);
    expect(p2.hand[0].name).toBe('bolt');
  });

  test('并发操作安全：效果结算期间任何人的操作都被锁拒绝', () => {
    const p1 = new Player(1); const p2 = new Player(2);
    const tm = new TurnManager([p1, p2]);
    tm.startTurn();
    p1.hand.push(mkCard('spell', 1));
    let attempts = 0;
    tm.playCard(1, 'spell', () => {
      for (const id of [1, 2]) {
        try { tm.playCard(id, mkCard('x', 0)); } catch { attempts++; }
        try { tm.endTurn(id); } catch { attempts++; }
        try { tm.skipTurn(id); } catch { attempts++; }
      }
    });
    expect(attempts).toBe(6);
    expect(tm.turn).toBe(1);
    expect(tm.isCurrentPlayer(1)).toBe(true);
  });

  test('技能费用与合法性校验：每回合限一次，结束后刷新', () => {
    const p1 = new Player(1); const p2 = new Player(2);
    const tm = new TurnManager([p1, p2]);
    const skill = { id: 'heal', cost: 2 };
    tm.startTurn();
    expect(tm.useSkill(1, skill)).toBe(true);
    expect(tm.useSkill(1, skill)).toBe(false);
    expect(p1.actionPoints).toBe(1);
    tm.endTurn();
    tm.startTurn();
    expect(p2.canUseSkill(skill)).toBe(true);
    tm.endTurn();
    tm.startTurn();
    expect(p1.canUseSkill(skill)).toBe(true);
  });
});
