/**
 * Created by Administrator on 14-2-23.
 */
var _ = require('lodash');

function license(){
    var pokerDb = [
        [],
        [],
        []
    ];

    var landlordsCards = [];

    for(var i = 0;i<17;i++){
        for(var x = 0;x<pokerDb.length;x++){
            pokerDb[x].push(generateNum());
        }
    }

    function generateNum(){
        var newPokerNum = _.random(1,54);
        for(var j = 0;j<pokerDb.length;j++){
            if(_.indexOf(pokerDb[j],newPokerNum) != -1){
                newPokerNum = generateNum();
                break;
            }
        }
        return newPokerNum;
    }

    var _sum = pokerDb[0].concat(pokerDb[1]).concat(pokerDb[2]);
    var allCards = [];
    for(var i = 1;i<=54;i++){
        allCards.push(i);
    }

    landlordsCards = _.difference(allCards,_sum);

    return {
        usersPorker:pokerDb,
        landlordCards:landlordsCards
    };
}

module.exports = exports = license;