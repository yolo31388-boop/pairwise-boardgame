class Player {
  constructor(id) {
    this.id = id;
    this.hand = [];
    this.actionPoints = 0;
    this.maxActionPoints = 3;
    this.tempEffects = [];
    this.skills = [];
    this.usedSkills = [];
    this.availableSkills = [];
    this.discardPile = [];
    this.deck = null;
    this.hp = 10;
    this.alive = true;
    this.victoryPoints = 0;
  }
  drawCard(card) { this.hand.push(card); }
  beginTurn() {
    this.actionPoints = this.maxActionPoints;
    this.tempEffects = [];
    this.usedSkills = [];
    this.availableSkills = [...this.skills];
    if (this.deck && this.deck.length > 0) this.hand.push(this.deck.pop());
  }
  endTurnCleanup() {
    this.tempEffects = [];
    this.actionPoints = 0;
    this.usedSkills = [];
    this.availableSkills = [];
  }
  playCard(card, game) {
    const idx = this.hand.indexOf(card);
    if (idx === -1) return false;
    const cost = (card && typeof card === 'object' && card.cost) || 0;
    if (cost > this.actionPoints) return false;
    this.actionPoints -= cost;
    this.hand.splice(idx, 1);
    this.discardPile.push(card);
    if (card && typeof card.effect === 'function') card.effect(this, game);
    return true;
  }
}

module.exports = { Player };
