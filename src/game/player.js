
class Player {
  constructor(id) { this.id=id; this.hand=[]; this.actionPoints=0; this.tempEffects=[]; }
  drawCard(card) { this.hand.push(card); }
  playCard(card) {
    // BUG: 不验证费用
    const idx = this.hand.indexOf(card);
    if (idx >= 0) this.hand.splice(idx, 1);
    return true;
  }
}

module.exports = { Player };
