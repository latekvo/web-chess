// TODO: CREDIT https://www.onlinelabels.com/clip-art/Chess_symbols_set-100629 Igor Krizanovskij for chess clip art

function createBoard() {

    // for some reason the '/div' gets added automatically, I cannot control it.
    let html_new_row = '<div class="chess-row flex-container" id="',
        html_end_row = '">',
        html_new_cell = '<div class="chess-box" id="',
        html_end_cell = '">'

    document.getElementById('game-board').innerHTML = "";
    for (let ver = 0; ver < 8; ver++) {
        let ver_real = String(ver + 1);
        document.getElementById('game-board').innerHTML += (html_new_row + ver_real + html_end_row);
        for (let hor = 0; hor < 8; hor++) {
            let hor_real = String.fromCharCode('a'.charCodeAt(0) + hor)
            document.getElementById(ver_real).innerHTML += (html_new_cell + ver_real + hor_real + html_end_cell);
            let id = ver_real + hor_real;



            console.log(id);
        }
    }
}

let pieceList = []
function arrangePieces() {

}

// source: https://stackoverflow.com/questions/1769584/get-position-of-element-by-javascript
function getPositionById(id){
    let domObject = document.getElementById(id);

    let x = 0, y = 0
    while (domObject !== null){
        x += domObject.offsetLeft;
        y += domObject.offsetTop;

        domObject = domObject.offsetParent;
    }

    return [x, y];
}

function init() {
    createBoard()


}

function reload() {

}