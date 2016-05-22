// npm: fast-levenshtein
window.lget = function(str1, str2) {
  if (str1 === str2) return 0;
  if (str1.length === 0) return str2.length;
  if (str2.length === 0) return str1.length;
  var prevRow  = new Array(str2.length + 1),
      curCol, nextCol, i, j, tmp;
  for (i=0; i<prevRow.length; ++i) {
    prevRow[i] = i;
  }
  for (i=0; i<str1.length; ++i) {
    nextCol = i + 1;
    for (j=0; j<str2.length; ++j) {
      curCol = nextCol;
      nextCol = prevRow[j] + ( (str1.charAt(i) === str2.charAt(j)) ? 0 : 1 );
      tmp = curCol + 1;
      if (nextCol > tmp) {
        nextCol = tmp;
      }
      tmp = prevRow[j + 1] + 1;
      if (nextCol > tmp) {
        nextCol = tmp;
      }
      prevRow[j] = curCol;
    }
    prevRow[j] = nextCol;
  }
  return nextCol;
};
