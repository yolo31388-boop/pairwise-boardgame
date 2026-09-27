class Hand {
  constructor() { this.cards = []; this.discard = []; this.deck = []; }
  discardCard(card) { this.discard.push(card); }
  draw() {
    if (this.deck.length === 0) {
      if (this.discard.length === 0) return undefined;
      this.deck = [...this.discard];
      for (let i = this.deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
      }
      this.discard = [];
    }
    return this.deck.pop();
  }
}

module.exports = { Hand };
