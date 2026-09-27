class Hand {
  constructor(cards = []) {
    this.cards = cards;
    this.discard = [];
    this.deck = [];
  }

  draw() {
    if (this.deck.length === 0) this.reshuffle();
    if (this.deck.length === 0) return null;
    return this.deck.pop();
  }

  discardCard(card) {
    if (card == null) return;
    this.discard.push(card);
  }

  add(card) {
    if (card == null) return;
    this.deck.push(card);
  }

  reshuffle() {
    if (this.discard.length === 0) return;
    const pile = this.discard;
    this.discard = [];
    for (let i = pile.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pile[i], pile[j]] = [pile[j], pile[i]];
    }
    this.deck.push(...pile);
  }
}

module.exports = { Hand };
