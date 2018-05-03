function getSelectionText() {
    var selectedText = "";
    if (window.getSelection) { // all modern browsers and IE9+
      selectedText = window.getSelection().toString()
    }
    return selectedText
  }

  function search(search) {
    var result = '';
    if (search.length > 5)
      for (var i = 0; i < qa.length; i++)
        if ((qa[i][0]+'').toLowerCase().search(search.toLowerCase()) > -1) result += '|' + qa[i][1]
    return result;
  }

  document.addEventListener('mouseup', function(e) {
    var thetext = getSelectionText();
    if (thetext.length > 5) { // check there's some text selected
      document.body.title = search(thetext);
    }
    setTimeout(function(){document.body.title = '';}, 2000);
  }, false);

  var qa = [[[1]]];