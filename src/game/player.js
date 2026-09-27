class Player {
  constructor(id, options = {}) {
    this.id = id;
    this.hand = [];
    this.actionPoints = 0;
    this.maxActionPoints = options.maxActionPoints || 3;
    this.tempEffects = [];
    this.hp = options.hp == null ? 30 : options.hp;
    this.alive = true;
    this.drawnThisTurn = 0;
    this.usedSkills = {};
  }

  startTurn(options = {}) {
    this.actionPoints = this.maxActionPoints;
    this.tempEffects = [];
    this.drawnThisTurn = 0;
    this.usedSkills = {};
    const draws = options.drawCount == null ? 1 : options.drawCount;
    for (let i = 0; i < draws; i++) {
      const card = options.deck ? options.deck.draw() : null;
      if (card) {
        this.hand.push(card);
        this.drawnThisTurn++;
      }
    }
    return this;
  }

  endTurn() {
    this.actionPoints = 0;
    this.tempEffects = [];
    this.drawnThisTurn = 0;
    this.usedSkills = {};
  }

  hasCard(cardOrName) {
    return this.findCardIndex(cardOrName) >= 0;
  }

  findCardIndex(cardOrName) {
    if (cardOrName && typeof cardOrName === 'object') return this.hand.indexOf(cardOrName);
    return this.hand.findIndex((c) => c && c.name === cardOrName);
  }

  canAfford(cost) {
    return this.actionPoints >= (cost || 0);
  }

  playCard(cardOrName) {
    if (this.resolving) throw new Error(`player ${this.id} is resolving an effect`);
    const idx = this.findCardIndex(cardOrName);
    if (idx < 0) return false;
    const card = this.hand[idx];
    const cost = card.cost || 0;
    if (!this.canAfford(cost)) return false;
    this.resolving = true;
    try {
      this.actionPoints -= cost;
      this.hand.splice(idx, 1);
    } finally {
      this.resolving = false;
    }
    return card;
  }

  refundCard(card, cost) {
    if (card) this.hand.push(card);
    this.actionPoints += cost || 0;
  }

  canUseSkill(skill) {
    const cost = skill && skill.cost || 0;
    return !!skill && !this.usedSkills[skill.id] && this.actionPoints >= cost;
  }

  useSkill(skill) {
    if (this.resolving) throw new Error(`player ${this.id} is resolving an effect`);
    if (!skill || this.usedSkills[skill.id]) return false;
    const cost = skill.cost || 0;
    if (this.actionPoints < cost) return false;
    this.resolving = true;
    try {
      this.actionPoints -= cost;
      this.usedSkills[skill.id] = true;
    } finally {
      this.resolving = false;
    }
    return true;
  }

  refundSkill(skill) {
    if (!skill) return;
    delete this.usedSkills[skill.id];
    this.actionPoints += skill.cost || 0;
  }
}

module.exports = { Player };
