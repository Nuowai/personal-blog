(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const layer = document.createElement('div');
  layer.className = 'sakura-layer';
  document.body.appendChild(layer);
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < 28; i += 1) {
    const petal = document.createElement('span');
    petal.className = 'sakura-petal';
    petal.style.setProperty('--left', `${Math.floor(Math.random() * 100)}%`);
    petal.style.setProperty('--size', `${Math.floor(Math.random() * 14 + 9)}px`);
    petal.style.setProperty('--duration', `${Math.floor(Math.random() * 8 + 7)}s`);
    petal.style.setProperty('--delay', `${Math.floor(Math.random() * -12)}s`);
    petal.style.setProperty('--drift', `${Math.floor(Math.random() * 80 - 40)}px`);
    petal.style.setProperty('--spin', `${Math.floor(Math.random() * 360)}deg`);
    fragment.appendChild(petal);
  }
  layer.appendChild(fragment);
})();
