// All rule-based games, keyed by id.
const list = ['blackjack', 'poker', 'vandatta', 'rummy', 'hjarter', 'patiens', 'finnsisjon', 'krig', 'chess'].map(n => require('./' + n));
module.exports = Object.fromEntries(list.map(e => [e.meta.id, e]));
