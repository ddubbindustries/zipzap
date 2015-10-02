//todo
// - exact sizing of screen
// - scoring for multiple categories

var u = {
  //log: function(){console.log.apply(this, arguments);},
  pct: function(val, sign){return (sign && val>0 ? '+':'') + (val*100).toFixed(2)+'%';},
  rand: function(max){return Math.floor(Math.random()*max);},
  randElm: function(arr){ return arr[u.rand(arr.length)];}, 
  repeat: function(str, n) {return Array(n+1).join(str);},
  circle: function(arr, i){return arr[i % arr.length];},
  randStr: function(str, len, maxRep) {
    var code = '', char = '';
    while(code.length <= len-maxRep){
      char = str[u.rand(str.length)];
      code += u.repeat(char, u.rand(maxRep)+1);
    }
    return code + u.repeat(str[u.rand(str.length)], len - code.length);
  },
  set: function(key,val) { return localStorage.setItem(key, JSON.stringify(val)); },
  get: function(key){ return JSON.parse(localStorage.getItem(key)); }
};

var $style = $('<style id="style"></style>').appendTo('head'),
    $code = $('#code'),
    $best = $('<div id="best"></div>'),
    help = $('<div/>').append('<h2>Welcome to ZipZap!</h2><p>Zip up the text by replacing repetitive sections with a single digit.</p>'+
      '<p>Select with a swipe. Or for touchscreens, tap the first, then last to make a selection, then tap the selection to add it to keychain.</p>',
      '<p>The <strong>delta</strong> shows the current selection\'s compression ratio. A selection is bad when the listing in the keychain takes up more space than can be saved by the replacing. Some break even.</p>',
      '<p>If you make a poor choice, you can always click items in the keychain to return them to the text.</p>',
      '<button id="primary">START</button>'
    ),
    gameover = $('<div/>').append(
      '<h2>Time\'s Up!</h2><h3>High Scores</h3>', 
      $best, 
      '<button id="primary">Next Round</button>'
    ),
    $popover = $('<div id="popover"/>').html(help).appendTo('body'),
    $stats = $('#stats').append($('<div/>').append(
      $('<div id="ratio"/>').append('<h2>ratio</h2><div class="val"/>'),
      $('<div id="delta"/>').append('<h2>delta</h2><div class="val"/>'),
      $('<div id="hint"/>').append('<h2>remaining</h2><div class="val"/>'),
      $('<div id="meta"/>').append('<h2>round</h2><div class="val"/>')
    )),
    $ratio = $('#ratio .val'), $delta = $('#delta .val'), 
    $hint = $('#hint .val'), $meta = $('#meta .val'),
    alpha = ['AB', 'ABCD', 'GTCA', 'LULZ', 'ASDF', 'ZNKW'],
    greek = String.fromCharCode(915,916,920,923,926,928,931,934,936,937),
    cyrillic = String.fromCharCode(1041,1043,1044,1046,1048,1051,1060,1064,1070,1071),
    symbol = '#&?$@'+String.fromCharCode(163,165,167,399,546,8364,8478,8984),
    keylist = '123456789'+greek+cyrillic+symbol,
    maxRepeat = 4,
    startSize = 500,
    startTime = 0,
    code = '',
    round = 0;

var updateView = function(){
  $code.height($(window).height()-$stats.height());
  var width = $code.width(),
      height = $code.height()-40,
      $chars = $('.char'),
      area = width * height,
      count = startSize, //$chars.length,
      unitArea = Math.floor(area/count),
      edge = Math.floor(Math.sqrt(unitArea)),
      fontSize = Math.floor(edge*0.85);
  $style.text(
    'body {font-size:'+fontSize+'px;}'+
    '.char {width:'+edge+'px; height:'+edge+'px;}'
  );
  $popover.css({
    top: $(window).height()/2 - $popover.outerHeight()/2,
    left: $(window).width()/2 - $popover.outerWidth()/2
  });
  updateStats();
};
var init = function(){
  selection = {start: -1, end: -1};
  mousedown = false; dragging = false;
  key = ''; keys = {}; ratio = 0; lastRatio = 1;
  best = u.get('best') || [],
  code = u.randStr(u.circle(alpha, round++), startSize, maxRepeat);
  $code.html(code.split('').map(function(v){ return '<span class="txt char">'+v+'</span>'; }));
  console.log('init round', round, best);
  $(window).resize(updateView).resize();
  $(document)
    .on('mousedown', '.txt', handle.charDown)
    .on('mouseup', '.txt', handle.charUp)
    .on('mouseenter', '.txt', handle.charEnter)
    .on('mouseenter mouseleave', '.keyset', handle.keyHover)
    .on('click', '.keyset', handle.keyClick);
  if (round == 1) { 
    $popover.html(help).show().find('#primary').click(function(){
      $popover.hide();
    });
  }
  $code.one('mouseup', startGame);
};
var startGame = function(){
  $popover.fadeOut();
  var time = startTime, clock = setInterval(function(){
    --time;
    var $open = $('.open');
    $open.slice(time).addClass('timer');
    if ($open.length + time <= 0) {
      clearInterval(clock);
      endGame();
    }
  }, 250);
};
var endGame = function(){
  $(document)
    .off('mousedown', '.txt', handle.charDown)
    .off('mouseup', '.txt', handle.charUp)
    .off('mouseenter', '.txt', handle.charEnter)
    .off('click', '.keyset', handle.keyClick);
  if(best.map(function(v){return v.ratio;}).indexOf(ratio) == -1)
    best.push({
      ratio: ratio, 
      size: startSize, 
      time: new Date(), 
      remaining: $hint.text(), 
      code: $code.text()
    });
  best.sort(function(a,b){return b.ratio > a.ratio;});
  best = best.slice(-10);
  u.set('best', best);
  updateStats();
  $popover.html(gameover).show().find('#primary').click(function(){
    $popover.hide();
    init();
  });
};

var getMatchIndices = function(haystack, needle) {
  var out = [];
  for (i=0, ii=haystack.length-needle.length+1; i<ii; i++){
    var chunk = haystack.slice(i,i+needle.length);
    if (haystack.slice(i,i+needle.length) == needle) {
      out.push([i, i+needle.length]);
      i += needle.length - 1;
    }
  }
  return out;
};
var countWords = function(haystack, len) {
  var out = {}, key = '';
  for (i=0, ii=haystack.length-len+1; i<ii; i++){
    key = haystack.slice(i,i+len);
    if (haystack.slice(i-1,i+len-1) == key && haystack.slice(i-2,i+len-2) !== key) continue;
    out[key] = out[key] ? out[key]+1 : 1;
  }
  return out;
};
var updateStats = function(){
  //ratio
  var hints= [];
  ratio = (startSize - $('.txt, .key').length)/startSize;
  var diff = ratio - lastRatio;
  var lastKey = Object.keys(keys).slice(-1);
  if (keys[lastKey] && !keys[lastKey].pct) keys[lastKey].pct = u.pct(diff, true);
  lastRatio = ratio;
  $ratio.html(u.pct(ratio));
  
  //hints
  $.each(countWords($code.text(), 2), function(k,v){ if (v>4) hints.push(k+' '+v); });
  $hint.addClass('tooltip').attr({title: hints.join(' | ')}).html(hints.length);
  
  //meta
  $meta.text(round);
  
  //best
  $best.empty(); 
  $.each(best, function(k,v){
    var score = '<div '+(v.ratio == ratio ? 'class="good"' : '')+'>'+
        u.pct(v.ratio)+' / '+v.remaining+'</div>';
    $best.append(score);
  });
};
var makeMatches = function(){
  if (selection.start > selection.end) {
    var temp = selection.end;
    selection.end = selection.start;
    selection.start = temp;
  }
  var $match = {}, 
      needle = $('.txt').slice(selection.start, selection.end+1).text(),
      matches = getMatchIndices($('.txt').text(), needle),
      net = matches.length * (needle.length - 1) - (2 + needle.length),
      hilight = net > 0 ? 'good' : ( net === 0 ? 'neutral' : 'bad');
  $.each(matches, function(k,v){
    $match = $('.txt').slice(v[0], v[1]).addClass(hilight).wrapAll('<span class="set"/>');
  });
   
  $delta.text(u.pct(net/startSize, true));
  $('#delta').removeClass().addClass(hilight);
};
var makeKey = function(newStr){
  var newKey = keylist[key++],
      $set = $('.set'),
      targetWidth = $('.char').width(),
      existingWidth = $set.width();
  keys[newKey] = {val: newStr};
  $set.text(newKey).toggleClass('txt char set');
  addKeyset(newKey, newStr);
  updateOpenspace();
  resetHilight();
  updateStats();
};
var addKeyset = function(newKey, newStr){
  var keyset = $.merge(['/', newKey], newStr.split(''))
      .map(function(v){ 
        return '<span class="key char">'+v+'</span>'; 
      }).join(''),
      $keyset = $('<span class="keyset">'+keyset+'</span>');
  $('.txt, .keyset').last().after($keyset);
};
var updateOpenspace = function(){
  $('.open').remove();
  var edge = $('.char').height(),
      opens = startSize - $('.txt, .key').length;
  if (opens > 0) 
    $('.keyset').last().after(Array(opens+1).join('<span class="open char">&nbsp;</span>'));
};
var resetHilight = function(){
  $('.set').contents().unwrap();
  $('.good, .neutral, .bad').removeClass('good neutral bad');
};

var handle = {
  charDown: function(){
    if ($(this).parent().is('.set')) {
      return false;
    } else if($('.set').length) {
      resetHilight();
      selection = {start:-1, end:-1};
    }
    mousedown = true;
    var index = $(this).index();
    if (selection.start == -1) {
      selection.start = index;
    } else {
      selection.end = index;
    }
    $(this).addClass('hilight');
  },
  charEnter: function(){
    if (mousedown) {
      resetHilight();
      dragging = true;
      var index = $(this).index();
      if (selection.start !== index) {
        selection.end = index;
        makeMatches();
      }
    }
  },
  charUp: function(){
    var selectedText = $('.set').eq(0).text();
    if (dragging || $('.set').length) {
      if ($('.set').length > 1 && selectedText.length > 1) makeKey(selectedText);
      resetHilight();
      selection = {start: -1, end: -1};
    } else if (selection.start > -1 && selection.end > -1) {
      makeMatches();
    }
    dragging = false;
    mousedown = false;
  },
  keyHover: function(){
    var key = $(this).text().slice(1,2), 
        $txt = $('.txt'),
        matches = getMatchIndices($txt.text(), key);
    $delta.text(keys[key].pct);
    $.each(matches, function(k,v){
      $txt.eq(v[0]).toggleClass('undo');
    });
  },
  keyClick: function(){
    var key = $(this).text().slice(1,2), 
        val = $(this).text().slice(2),
        $txt = $('.txt'),
        matches = getMatchIndices($txt.text(), key);
    $.each(matches, function(k,v){
      var $noob = $(val.split('').map(function(v){return '<span class="txt char">'+v+'</span>';}).join(''));
      $txt.eq(v[0]).html($noob);
      $noob.unwrap();
    });
    $(this).remove();
    delete keys[key];
    updateOpenspace();
    updateView();
  }
};
  
$(document).ready(init);

