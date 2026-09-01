const test = require('node:test');
const assert = require('node:assert/strict');
const { compareTexts } = require('../src/services/similarityService');

test('identical scientific text has high similarity', () => {
  const text = 'Метод машинного обучения используется для анализа экспериментальных данных и построения прогнозной модели. '.repeat(20);
  const r = compareTexts(text, text);
  assert.ok(r.percent > 95);
});

test('different text has low similarity', () => {
  const a = 'Исследование посвящено компьютерному зрению и анализу изображений нейронными сетями. '.repeat(20);
  const b = 'Ботанический эксперимент рассматривает рост растений в зависимости от влажности почвы и освещения. '.repeat(20);
  const r = compareTexts(a, b);
  assert.ok(r.percent < 10);
});
