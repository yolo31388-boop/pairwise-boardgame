
class TurnManager {
  constructor(players) { this.players = players; this.current = 0; this.turn = 1; this.locked = false; }
  startTurn() {
    // BUG: 不锁定，不初始化
    this.locked = false;
  }
  endTurn() {
    // BUG: 不清理临时状态
    this.current = (this.current + 1) % this.players.length;
    if (this.current === 0) this.turn++;
  }
  isCurrentPlayer(playerId) { return this.players[this.current].id === playerId; }
  playCard(playerId, card) {
    // BUG: 不验证当前玩家
    return this.players[this.current].playCard(card);
  }
}

module.exports = { TurnManager };
