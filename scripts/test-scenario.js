const content = `Ahora vamos a profundizar. En seguridad laboral identificamos 7 tipos de peligros principales:

Físicos: ruido, vibración, temperatura extrema, radiación Químicos: gases, vapores, polvos, líquidos tóxicos Biológicos: virus, bacterias, hongos Ergonómicos: posturas forzadas, movimientos repetitivos, levantamiento de cargas Psicosociales: estrés, acoso, carga mental Mecánicos: atrapamiento, corte, golpe por máquinas/herramientas Locativos: pisos resbaladizos, escaleras defectuosas, espacios confinados

Cada uno requiere controles específicos según su naturaleza.

ESCENARIO: taller de soldadura

Te describo un taller de soldadura: hay máquinas funcionando, humos en el ambiente, ruido constante, cables en el piso y trabajadores en posturas incómodas. ¿Qué tipos de peligros identificas? Clasifícalos.`;

const scenarioPatterns = [
  /[Tt]e\s+describo\s+(?:un[ao]?\s+)?([^:]+?):\s*([^.?!]+)/g,
  /[Ii]magina\s+(?:que\s+)?(?:estás\s+en\s+)?(?:un[ao]?\s+)?([^.?!]+)/g,
  /[Pp]iensa\s+en\s+(?:un[ao]?\s+)?([^.?!]+)/g,
  /[Ee]n\s+(?:un[ao]?\s+)?(taller|fábrica|obra|oficina|almacén|laboratorio|cocina|hospital|construcción|mina|planta)[^.?!]*/gi,
  /[Ss]upongamos\s+que\s+([^.?!]+)/g,
  /[Pp]or\s+ejemplo[,:]?\s+(?:en\s+)?(?:un[ao]?\s+)?([^.?!]+)/g,
];

console.log("=== TESTING SCENARIO EXTRACTION ===\n");

let lastScenario = null;
for (const pattern of scenarioPatterns) {
  pattern.lastIndex = 0;
  let match;
  while ((match = pattern.exec(content)) !== null) {
    console.log('Match found:', match[0].substring(0, 100));
    lastScenario = match[0].trim();
  }
}

console.log('\n=== LAST SCENARIO (will be used) ===');
console.log(lastScenario ? (lastScenario.length > 120 ? lastScenario.substring(0, 117) + '...' : lastScenario) : 'null');
