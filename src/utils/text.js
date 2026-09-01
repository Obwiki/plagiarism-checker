const STOP_WORDS = new Set([
  'и','в','во','не','что','он','на','я','с','со','как','а','то','все','она','так','его','но','да','ты','к','у','же','вы','за','бы','по','только','ее','мне','было','вот','от','меня','еще','нет','о','из','ему','теперь','когда','даже','ну','вдруг','ли','если','уже','или','ни','быть','был','него','до','вас','нибудь','опять','уж','вам','ведь','там','потом','себя','ничего','ей','может','они','тут','где','есть','надо','ней','для','мы','тебя','их','чем','была','сам','чтоб','без','будто','чего','раз','тоже','себе','под','будет','ж','тогда','кто','этот','того','потому','этого','какой','совсем','ним','здесь','этом','один','почти','мой','тем','чтобы','нее','сейчас','были','куда','зачем','сказать','всех','никогда','сегодня','можно','при','наконец','два','об','другой','хоть','после','над','больше','тот','через','эти','нас','про','всего','них','какая','много','разве','три','эту','моя','впрочем','хорошо','свою','этой','перед','иногда','лучше','чуть','том','нельзя','такой','им','более','всегда','конечно','всю','между',
  'the','a','an','and','or','but','if','then','else','of','to','in','on','for','with','by','as','at','from','is','are','was','were','be','been','being','this','that','these','those','it','its','we','our','you','your','they','their','he','she','his','her','not','can','could','may','might','will','would','should','do','does','did','have','has','had','than','into','about','over','under','such','also'
]);

function normalizeText(text) {
  return String(text || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[\u0000-\u001f]/g, ' ')
    .replace(/[^\p{L}\p{N}\s.-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text) {
  return normalizeText(text)
    .split(/\s+/)
    .map(w => w.replace(/^[.-]+|[.-]+$/g, ''))
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

function splitSentences(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[\p{Lu}\d])/u)
    .map(s => s.trim())
    .filter(s => s.length >= 40);
}

function makeShingles(tokens, size = 7) {
  const set = new Set();
  if (tokens.length < size) return set;
  for (let i = 0; i <= tokens.length - size; i++) {
    set.add(tokens.slice(i, i + size).join(' '));
  }
  return set;
}

module.exports = { normalizeText, tokenize, splitSentences, makeShingles };
