class TurnManager {
  constructor(players, options = {}) {
    this.players = players;
    this.current = 0;
    this.turn = 1;
    this.locked = false;
    this.winner = null;
    this.gameOver = false;
    this.victoryTarget = options.victoryTarget || 10;
  }
  currentPlayer() { return this.players[this.current]; }
  isCurrentPlayer(playerId) { return this.currentPlayer().id === playerId; }
  startTurn() {
    if (this.gameOver) return false;
    this.currentPlayer().beginTurn();
    return true;
  }
  endTurn() {
    if (this.locked) throw new Error('效果结算中，不能结束回合');
    if (this.gameOver) return;
    this.currentPlayer().endTurnCleanup();
    if (this.players.filter(p => p.alive).length <= 1) { this.checkVictory(); return; }
    do {
      this.current = (this.current + 1) % this.players.length;
      if (this.current === 0) this.turn++;
    } while (!this.currentPlayer().alive);
  }
  skipTurn(playerId) {
    if (this.locked) throw new Error('效果结算中，不能跳过回合');
    if (!this.isCurrentPlayer(playerId)) throw new Error('非当前玩家，不能跳过回合');
    this.endTurn();
  }
  playCard(playerId, card) {
    if (this.gameOver) throw new Error('游戏已结束');
    if (this.locked) throw new Error('效果结算中，操作被拒绝');
    if (!this.isCurrentPlayer(playerId)) throw new Error('非当前玩家，操作被拒绝');
    this.locked = true;
    let result;
    try {
      result = this.currentPlayer().playCard(card, this);
    } finally {
      this.locked = false;
    }
    this.checkVictory();
    return result;
  }
  checkVictory() {
    if (this.gameOver) return this.winner;
    const alive = this.players.filter(p => p.alive);
    if (this.players.length > 1 && alive.length === 1) {
      this.winner = alive[0];
      this.gameOver = true;
    } else if (alive.length === 0) {
      this.gameOver = true;
    } else {
      const victor = this.players.find(p => p.alive && p.victoryPoints >= this.victoryTarget);
      if (victor) { this.winner = victor; this.gameOver = true; }
    }
    return this.winner;
  }
}

module.exports = { TurnManager };
