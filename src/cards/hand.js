
class Hand {
  constructor() { this.cards = []; this.discard = []; this.deck = []; }
  draw() {
    if (this.deck.length === 0) {
      // BUG: 洗回时可能丢失或重复
      this.deck = [...this.discard];
      this.discard = [];
    }
    return this.deck.pop();
  }
}

module.exports = { Hand };
