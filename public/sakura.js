(function () {
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  var layer = document.createElement('div');
  layer.className = 'sakura-layer';
  document.body.appendChild(layer);

  var count = 28;
  var fragment = document.createDocumentFragment();
  for (var i = 0; i < count; i++) {
    var petal = document.createElement('span');
    petal.className = 'sakura-petal';
    petal.style.setProperty('--left', Math.floor(Math.random() * 100) + '%');
    petal.style.setProperty('--size', Math.floor(Math.random() * 14 + 9) + 'px');
    petal.style.setProperty('--duration', Math.floor(Math.random() * 8 + 7) + 's');
    petal.style.setProperty('--delay', Math.floor(Math.random() * -12) + 's');
    petal.style.setProperty('--drift', Math.floor(Math.random() * 80 - 40) + 'px');
    petal.style.setProperty('--spin', Math.floor(Math.random() * 360) + 'deg');
    fragment.appendChild(petal);
  }
  layer.appendChild(fragment);
})();
