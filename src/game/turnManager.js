class TurnManager {
  constructor(players, options = {}) {
    if (!Array.isArray(players) || players.length === 0) {
      throw new Error('TurnManager requires at least one player');
    }
    this.players = players;
    this.current = 0;
    this.turn = 1;
    this.locked = false;
    this.active = false;
    this.winner = null;
    this.over = false;
    this.deck = options.deck || null;
    this.drawCount = options.drawCount == null ? 1 : options.drawCount;
    this.victoryCheck = options.victoryCheck || (() => this.defaultVictoryCheck());
  }

  currentPlayer() {
    return this.players[this.current];
  }

  isCurrentPlayer(playerId) {
    return this.currentPlayer().id === playerId;
  }

  defaultVictoryCheck() {
    if (this.players.length < 2) return null;
    const alive = this.players.filter((p) => p.alive !== false && p.hp > 0);
    if (alive.length === 1) return alive[0].id;
    return null;
  }

  checkVictory() {
    if (this.over) return this.winner;
    const winnerId = this.victoryCheck(this);
    if (winnerId != null) {
      this.over = true;
      this.winner = winnerId;
      this.active = false;
    }
    return this.winner;
  }

  assertOperable(playerId) {
    if (this.over) throw new Error('game is already over');
    if (!this.active) throw new Error('no active turn');
    if (this.locked) throw new Error('turn is locked while an effect resolves');
    if (!this.isCurrentPlayer(playerId)) {
      throw new Error(`player ${playerId} cannot act on another player's turn`);
    }
  }

  startTurn() {
    if (this.over) throw new Error('cannot start a turn after the game is over');
    if (this.active) throw new Error('a turn is already in progress');
    this.active = true;
    this.locked = false;
    this.currentPlayer().startTurn({ deck: this.deck, drawCount: this.drawCount });
    return this.currentPlayer();
  }

  finishTurn() {
    this.currentPlayer().endTurn();
    this.current = (this.current + 1) % this.players.length;
    if (this.current === 0) this.turn++;
    this.active = false;
    this.locked = false;
    this.checkVictory();
  }

  endTurn(playerId) {
    if (this.over) throw new Error('game is already over');
    if (!this.active) throw new Error('no active turn to end');
    if (this.locked) throw new Error('cannot end turn while an effect resolves');
    if (playerId != null && !this.isCurrentPlayer(playerId)) {
      throw new Error(`player ${playerId} cannot end another player's turn`);
    }
    this.finishTurn();
  }

  skipTurn(playerId) {
    if (playerId == null) throw new Error('skipTurn requires a player id');
    this.assertOperable(playerId);
    this.finishTurn();
  }

  playCard(playerId, cardOrName, effect) {
    this.assertOperable(playerId);
    const player = this.currentPlayer();
    const idx = player.findCardIndex(cardOrName);
    if (idx < 0) throw new Error('player does not own that card');
    const card = player.hand[idx];
    const cost = card.cost || 0;
    if (!player.canAfford(cost)) return false;

    this.locked = true;
    let removed = null;
    try {
      removed = player.playCard(card);
      if (this.deck) this.deck.discardCard(card);
      if (typeof effect === 'function') {
        effect({ player, card, manager: this });
      }
    } catch (err) {
      if (removed) {
        if (this.deck) {
          const discardIdx = this.deck.discard.lastIndexOf(card);
          if (discardIdx >= 0) this.deck.discard.splice(discardIdx, 1);
        }
        player.refundCard(card, cost);
      }
      throw err;
    } finally {
      this.locked = false;
    }

    this.checkVictory();
    return card;
  }

  useSkill(playerId, skill, effect) {
    this.assertOperable(playerId);
    const player = this.currentPlayer();
    if (!player.canUseSkill(skill)) return false;

    this.locked = true;
    let consumed = false;
    try {
      consumed = player.useSkill(skill);
      if (typeof effect === 'function') {
        effect({ player, skill, manager: this });
      }
    } catch (err) {
      if (consumed) player.refundSkill(skill);
      throw err;
    } finally {
      this.locked = false;
    }

    this.checkVictory();
    return true;
  }
}

module.exports = { TurnManager };
