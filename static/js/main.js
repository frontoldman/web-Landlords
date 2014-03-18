/**
 * Created by Administrator on 14-3-16.
 */
(function(){
    //规则1-13 红桃
//14-26 梅花
//27-39 黑桃
//40-52 方块
//53 54 小鬼 大鬼
    var socket = io.connect('http://localhost');

    var color = ['hearts', 'plum-flower', 'spades', 'square-piece'],
        myPorkers,
        userCards = {},
        prevCardsSend = [],
        waitInter,
        grabInter,
        throwInter,
        otherThrowInter;

    var thumb_img = {
        landlord:'/img/land1.png',
        framer:'/img/land2.png',
        partner:'/img/land3.png'
    }

    //上家的牌
    var prevCrads ;

    var cardsChoose = [],
        cardIds = [];

    socket.on('room-in', function (username) {

        socket.on('init-poker-' + username, function (userPorker) {
            myPorkers = userPorker;
            userCards = analysisUserPorker(userPorker);
            renderUI();
        });

        socket.on('start-grab-landlord-' + username, function (time) {
            showGrab(time, username);
        });

        socket.on('wait-for-grab-' + username, function (relative) {
            var current = relative[0],
                standard = relative[1],
                distance = Math.abs(current - standard),
                time = relative[2];

            if (current < standard) {
                if (distance === 1) {
                    //右边抢地主
                    showOthersGrab(time, 'next');
                } else {
                    //左边抢地主
                    showOthersGrab(time, 'prev');
                }
            } else {
                if (distance === 1) {
                    //左边抢地主
                    showOthersGrab(time, 'prev');
                } else {
                    //右边抢地主
                    showOthersGrab(time, 'next');
                }
            }
        });

        socket.on('start-play-' + username,function(relative,time){
            var status = relative[0],
                thumb = $('#thumb'),
                img = thumb.find('img'),
                thumb_right = $('#thumb_right'),
                thumb_right_img = thumb_right.find('img'),
                thumb_left = $('#thumb_left'),
                thumb_left_img = thumb_left.find('img'),
                landlordCards = relative[1],
                allCards = relative[2];


            clearInterval(waitInter);
            $('#other_grab').hide();
            thumb.show();
            thumb_right.show();
            thumb_left.show();


            //console.log(landlordCards);

            switch(status){
                case 1://地主
                    console.log('地主');
                    img.attr('src',thumb_img.landlord);
                    thumb_right_img.attr('src',thumb_img.framer);
                    thumb_left_img.attr('src',thumb_img.partner);
                    userCards = {};
                    myPorkers = allCards;
                    userCards = analysisUserPorker(allCards);
                    renderMyUI($('#user_cards'),userCards);
                    showThrow(time);
                    break;
                case 2:
                    console.log('搭档');
                    img.attr('src',thumb_img.partner);
                    thumb_right_img.attr('src',thumb_img.landlord);
                    renderPreNext(20,$('#right'));
                    thumb_left_img.attr('src',thumb_img.framer);
                    showOtherThrow(time,'next');
                    break;
                case 3:
                    console.log('农民');
                    img.attr('src',thumb_img.framer);
                    thumb_right_img.attr('src',thumb_img.partner);
                    thumb_left_img.attr('src',thumb_img.landlord);
                    renderPreNext(20,$('#left'));
                    showOtherThrow(time,'prev');
                    break;
            }

            var landlordCardsColor = analysisUserPorker(landlordCards);
            var top = $('#top'),
                left = 0;
            top.html('');
            for (var i = 17; i > 2; i--) {
                if (landlordCardsColor[i]) {
                    for (var j = 0; j < landlordCardsColor[i].length; j++) {
                        imgObj = $('<img src="/img/pokers/' + landlordCardsColor[i][j].card + '.jpg"/>');
                        imgObj.css({
                            left: left+'px'
                        });
                        top.append(imgObj);
                        left+=150;
                    }
                }
            }
        });

        //监听出牌之后的事件
        socket.on('after-throw',function(time){
            var cardsThrowedContent = $('#cards_throwed_content')

            showOtherThrow(time,'next');
            $('#throw').hide();
            clearInterval(throwInter);
            userCards = analysisUserPorker(myPorkers);
            renderMyUI($('#user_cards'),userCards);
            var cardsThrowed = analysisUserPorker(cardIds);
            renderMyUI(cardsThrowedContent,cardsThrowed);
            cardsThrowedContent.show();
            cardsChoose.length = 1;
            cardIds.length = 1;
        });

        //监听出牌事件
        socket.on('throwing-' + username,function(cardIds,cardsChoose,complyRules,time){
            var other_grab = $('#other_grab');
            showThrow(time);
            clearInterval(otherThrowInter);
            other_grab.hide();
            showCardsPrev(cardIds);
        });

        //监听上家出牌的事件
        socket.on('waiting-for-throwing-' + username,function(cardIds,cardsChoose,complyRules,time){
            clearInterval(otherThrowInter);
            showOtherThrow(time,'prev');
            showCardsNext(cardIds);
        });



        //别人逃跑
        socket.on('somebody-run-away-' + username,function(runawayUser){
           // alert(runawayUser + '逃跑了,系统将补偿你10000000000000亿美金！！！');
            initBack();
        });
    })

//renderUI
    function renderUI() {
        var user_cards = $('#user_cards'),
            preUser = $('#left'),
            nextUser = $('#right'),
            top = $('#top'),
            imgObj,
            size = 0;

        user_cards.html('');
        preUser.html('');
        nextUser.html('');
        top.html('')

        renderMyUI(user_cards,userCards);

        renderPreNext(17, preUser, nextUser);

        for (var i = 0; i < 3; i++) {
            imgObj = $('<img src="/img/pokers/back.jpg"/>');
            imgObj.css({
                top: 0,
                left: (100 + 50) * i
            })
            top.append(imgObj);
        }
    }

//渲染我的牌
    function renderMyUI(content,userCards,noLocation) {
        var imgObj,
            size = 0,
            allImgSize = 0;

        content.html('');
        for (var i = 17; i > 2; i--) {
            if (userCards[i]) {
                for (var j = 0; j < userCards[i].length; j++) {
                    imgObj = $('<img class="card" data-id="'+ userCards[i][j].id +'" data-card="'+ userCards[i][j].card +'" src="/img/pokers/' + userCards[i][j].card + '.jpg"/>');
                    imgObj.css({
                        left: size,
                        top: 10
                    })
                    content.append(imgObj);
                    size += 30;
                    allImgSize++;
                }
            }
        }

        var width = 100 + (allImgSize - 1) * 30;

        content.css({
            width: width
        })

        if(!noLocation){
            var left = ($(window).width() - width) / 2;
            content.css({
                left: left
            })
        }
    }

//渲染上下家牌
    function renderPreNext(pokersSize) {
        var size = 0,
            prev, next;

        if (arguments.length > 2) {
            prev = arguments[1];
            next = arguments[2];
        } else if (arguments.length === 2) {
            prev = arguments[1];
        }

        for (var i = 0; i < pokersSize; i++) {
            imgObj = $('<img src="/img/pokers/back.jpg"/>');
            imgObj.css({
                top: size
            })
            prev.append(imgObj);

            if (next) {
                imgObj = $('<img src="/img/pokers/back.jpg"/>');
                imgObj.css({
                    top: size
                })
                next.append(imgObj);
            }
            size += 10;
        }

    }

//分析扑克，解析花色
    function analysisUserPorker(userPorker) {
        var currentCard,
            currentColor,
            colorNum,
            userColorInex;

        var userCards = {};
        for (var i = 0; i < userPorker.length; i++) {
            currentCard = userPorker[i];
            if (currentCard === 54) {
                userCards[17] = [{
                    id:54,
                    card:'big-joker'
                }]
            } else if (currentCard === 53) {
                userCards[16] = [{
                    id:53,
                    card:'small-joker'
                }]
            } else {
                currentColor = color[Math.floor((currentCard - 0.1) / 13)];
                //currentColor
                colorNum = currentCard % 13;
                if (colorNum === 2) {
                    userColorInex = 15;
                } else if (colorNum === 1) {
                    userColorInex = 14;
                } else if (colorNum === 0) {
                    userColorInex = 13;
                    colorNum = 13;
                } else {
                    userColorInex = colorNum;
                }
                if (!userCards[userColorInex]) {
                    userCards[userColorInex] = [];
                }
                userCards[userColorInex].push({
                    id:currentCard,
                    card:currentColor + '-' + colorNum
                })
            }
        }

        return userCards;
    }

//显示抢地主
    function showGrab(time, username) {
        var start_grab = $('#grab_content'),
            timeContent = $('#time_left'),
            other_grab = $('#other_grab'),
            width;

        other_grab.hide();
        start_grab.show();
        clearInterval(waitInter);
        clearInterval(grabInter);

        width = start_grab.width();

        start_grab.css({
            left: ($(window).width() - width) / 2
        });

        timeContent.html(time);
        grabInter = setInterval(function () {
            time--;
            //时间到，不抢了
            if (time <= 0) {
                clearInterval(grabInter);
                start_grab.hide();
                socket.emit('grab', false);
            }
            timeContent.html(time)
        }, 1000);
    }

//显示他人抢地主
    function showOthersGrab(time, location) {
        var other_grab = $('#other_grab'),
            grab_content = $('#grab_content');


        if (location == 'prev') {
            other_grab.css({
                'left': '200px',
                'right': 'auto'
            })
        } else if (location == 'next') {
            other_grab.css({
                'right': '200px',
                'left': 'auto'
            })
        }

        grab_content.hide();
        clearInterval(grabInter);
        clearInterval(waitInter);
        other_grab.show();
        other_grab.html(time).css('display', 'block');

        waitInter = setInterval(function () {
            time--;
            if (time <= 0) {
                clearInterval(waitInter);
                other_grab.hide();
                return;
            }
            other_grab.html(time);
        }, 1000);
    }

//显示出牌
    function showThrow(time){
        var $throw = $('#throw'),
            timeContent = $('#throw_time_left');

        $throw.show();

        var width = $throw.width();

        $throw.css({
            left: ($(window).width() - width) / 2
        });
        timeContent.html(time);
        throwInter = setInterval(function () {
            time--;
            //时间到，不出牌
            if (time <= 0) {
                clearInterval(throwInter);
                //  $throw.hide();
                //  socket.emit('throw-cards', false);
            }
            timeContent.html(time)
        }, 1000);

    }

//显示别人出牌
    function showOtherThrow(time,location){
        var other_grab = $('#other_grab');

        if (location == 'prev') {
            other_grab.css({
                'left': '200px',
                'right': 'auto'
            })
        } else if (location == 'next') {
            other_grab.css({
                'right': '200px',
                'left': 'auto'
            })
        }

        other_grab.html(time).css('display', 'block');
        otherThrowInter = setInterval(function () {
            time--;
            if (time <= 0) {
                clearInterval(otherThrowInter);
                other_grab.hide();
                return;
            }
            other_grab.html(time);
        }, 1000);
    }

    //显示上家出的牌
    function showCardsPrev(cardIds){
        var cards_prev_throwed_content = $('#cards_prev_throwed_content');
        cards_prev_throwed_content.html('');
        var prevCrads = analysisUserPorker(cardIds);
        renderMyUI(cards_prev_throwed_content,prevCrads,true);
        cards_prev_throwed_content.show();
    }

    //显示下家出的牌
    function showCardsNext(cardIds){
        var cards_next_throwed_content = $('#cards_next_throwed_content');
        cards_next_throwed_content.html('');
        var nextCrads = analysisUserPorker(cardIds);
        renderMyUI(cards_next_throwed_content,nextCrads,true);
        cards_next_throwed_content.show();
    }

    function initBack(){
        clearInterval(waitInter);
        clearInterval(grabInter);
        clearInterval(throwInter);
        clearInterval(otherThrowInter);
        $('#thumb_left').hide();
        $('#thumb_right').hide();
        $('#thumb').hide();

    }

//绑定事件
    var start_grab = $('#start_grab'),
        grab_content = $('#grab_content'),
        donot_grab = $('#donot_grab');

    start_grab.on('click', function () {
        clearInterval(grabInter);
        grab_content.hide();
        socket.emit('grab', true);
    })

    donot_grab.on('click', function () {
        clearInterval(grabInter);
        grab_content.hide();
        socket.emit('grab', false);
    })



    $(document).on('click','.card',function(){
        var $thisCard = $(this),
            id = $thisCard.data('id'),
            originCard = $thisCard.data('card'),
            reg = /[^\d]+-(\d+)/,
            choosed = $thisCard.data('choosed'),
            card,
            result;


        if(id != 54 && id != 53){
            result = reg.exec(originCard);
            if(result.length === 2){
                card = result[1];
            }
            if(card == 1){
                card = 14
            }
            if(card == 2){
                card = 16;
            }
        }else{
            card = id;
        }

        if(!choosed){
            $thisCard.animate({
                top:'-10px'
            },100);
            cardsChoose.push({
                id:id,
                card:card,
                originCard:originCard
            })
            $thisCard.data('choosed',true);
        }else{
            $thisCard.animate({
                top:'10px'
            },100)
            for(var i = 0;i<cardsChoose.length;i++){
                if(id === cardsChoose[i].id){
                    cardsChoose.splice(i,1);
                    break;
                }
            }
            $thisCard.data('choosed',false);
        }

        cardsChoose.sort(function(a,b){
            return b.card - a.card;
        });

        console.log(cardsChoose)

    });

    var $throw_out = $('#throw_out'),
        $donot_throw = $('#donot_throw');

//出牌需满足两个条件 出的牌符合规则 大于上家的牌
    $throw_out.on('click',function(){
        var complyRules = checkCardsRule();

        console.log(complyRules);
        if(!complyRules){
            alert('您的牌不符合规则');
            return;
        }

        getIds();
        if(prevCrads){

        }else{
            difference(myPorkers,cardIds);
            socket.emit('throw-card',cardIds,cardsChoose,complyRules,myPorkers);
        }

    });

    //取得牌id集合
    function getIds(){
        for(var i = 0;i<cardsChoose.length;i++){
            cardIds.push(cardsChoose[0].id);
        }
    }

    function difference(content,children){
        var contentObj = {},
            childrenObj = {},
            newContent = [];

        content.forEach(function(val){
            contentObj[val] = true;
        });

        children.forEach(function(val){
            childrenObj[val] = true;
        });

        for(var i in childrenObj){
            delete contentObj[i];
        }

        content.length = 0;
        for(var i in contentObj){
            content.push(i*1);
        }
    }

    //出牌规则
    function checkCardsRule(){
        var result ;
        for(var rule in rules){
            result = rules[rule]();
            if(result){
                return result;
            }
        }
        return false;
    }

    var rules = {
        //一对
        one:function(){
            var length = cardsChoose.length,
                card ,
                result = {};

            if(length === 1){
                card = cardsChoose[0].card;
                result.name = 'one';
                result.card = card;
                return result;
            }
            return false;
        },
        pairs:function(){
            var length = cardsChoose.length;
            if(length==2&&cardsChoose[0].card === cardsChoose[1].card){
                return true;
            }
            return false;
        },
        three:function(){
            var length = cardsChoose.length;
            if(length == 3
                && cardsChoose[0].card === cardsChoose[1].card
                && cardsChoose[1].card === cardsChoose[2].card){
                return true;
            }
            return false;
        },
        threeWithOne:function(){
            var length = cardsChoose.length;
            if(length == 4 ){
                if((cardsChoose[0].card === cardsChoose[1].card && cardsChoose[1].card === cardsChoose[2].card)
                    || (cardsChoose[1].card === cardsChoose[2].card && cardsChoose[2].card === cardsChoose[3].card)){
                    return true;
                }
            }
            return false;
        },
        threeWithPairs:function(){
            var length = cardsChoose.length;
            if(length == 5 ){
                if((cardsChoose[0].card === cardsChoose[1].card && cardsChoose[1].card === cardsChoose[2].card
                    && cardsChoose[3].card === cardsChoose[4].card)
                    || (cardsChoose[2].card === cardsChoose[3].card && cardsChoose[3].card === cardsChoose[4].card
                    && cardsChoose[0].card === cardsChoose[1].card)){
                    return true;
                }
            }
            return false;
        },
        four:function(){
            var length = cardsChoose.length;
            if(length == 4 ){
                if(cardsChoose[0].card === cardsChoose[1].card
                    && cardsChoose[0].card === cardsChoose[2].card
                    && cardsChoose[0].card === cardsChoose[3].card){
                    return true;
                }
            }
            return false;
        },
        fourWithTwo:function(){
            var length = cardsChoose.length,
                uniques = {},
                card;
            if(length == 6 ){
                for(var i = 0;i<length;i++){
                    card = cardsChoose[i].card;
                    if(uniques[card]){
                        uniques[card] ++;
                        if(uniques[card] === 4){
                            return true;
                        }
                    }else{
                        uniques[card] = 1;
                    }
                };
            }

            return false;
        },
        fourWithPairs:function(){
            var length = cardsChoose.length,
                uniques = {},
                threeObj = {},
                card;

            if(length == 8 ){
                for(var i = 0;i<length;i++){
                    card = cardsChoose[i].card;
                    if(uniques[card]){
                        uniques[card] ++;
                    }else{
                        uniques[card] = 1;
                    }
                };
            }

            for(var i in uniques){
                if(uniques[i] === 4){
                    threeObj[4] = true;
                }else if(uniques[i] === 2){
                    if(threeObj[2]){
                        threeObj[2]++;
                    }else{
                        threeObj[2] = 1;
                    }
                }
            }

            if(threeObj[4] && threeObj[2] === 2){
                return true;
            }

            return false;
        },
        junko:function(){
            var length = cardsChoose.length,
                current ;
            if(length>=5){
                for(var i = 0;i<length;i++){
                    //有大小鬼返回false;
                    if(isNaN(cardsChoose[i].card)){
                        return false;
                    }
                    //有2返回false;
                    if(cardsChoose[i].card == 2){
                        return false;
                    }
                    if(!current){
                        current =  cardsChoose[i].card * 1 ;
                    }else{
                        if(current != cardsChoose[i].card * 1 + 1){
                            return false;
                        }
                        current = cardsChoose[i].card * 1 ;
                    }
                }
                return true;
            }else{
                return false;
            }
        },
        company:function(){
            var length = cardsChoose.length;
            if(length >= 6 && length%2 === 0){
                for(var i = 0;i<length;i+=2){
                    if(cardsChoose[i].card != cardsChoose[i+1].card ){
                        return false;
                    }
                    if(i != length-2){
                        if(cardsChoose[i].card != cardsChoose[i+2].card*1+1){
                            return false;
                        }
                    }
                }
                return true;
            }
            return false;
        },
        aircraft:function(){
            var length = cardsChoose.length,
                card,
                threeObj = [],
                oneObj = [],
                twoObj = [],
                uniques = {};

            if( length>5 && (length%4 ===0 || length%5 ===0) ){
                for(var i = 0;i<length;i++){
                    for(var i = 0;i<length;i++){
                        card = cardsChoose[i].card;
                        if(uniques[card]){
                            uniques[card] ++;
                        }else{
                            uniques[card] = 1;
                        }
                    };
                }

                for(var i in uniques){
                    switch(uniques[i]){
                        case 3:
                            threeObj.push(i);
                            break;
                        case 2:
                            twoObj.push(i);
                            break;
                        case 1:
                            oneObj.push(i);
                            break;
                    }
                }

                var currentOneOfThree;

                if(threeObj.length>=2){

                    if(twoObj.length && oneObj.length){
                        return false;
                    }

                    for(var i = 0;i<threeObj.length;i++){
                        if(!currentOneOfThree){
                            currentOneOfThree = threeObj[i]*1;
                        }else{
                            if( currentOneOfThree != threeObj[i]*1 + 1){
                                return false;
                            }
                            currentOneOfThree = threeObj[i]*1;
                        }
                    }

                    if(!twoObj.length && !oneObj.length){
                        return true;
                    }

                    if(twoObj.length>0 && twoObj.length != threeObj.length){
                        return false;
                    }

                    if(oneObj.length>0 && oneObj.length != threeObj.length){
                        return false;
                    }

                }

                return true;
            }
            return false;
        },
        bomb:function(){
            var length = cardsChoose.length;
            if(length === 4){
                if(cardsChoose[0].card === cardsChoose[1].card
                    && cardsChoose[0].card === cardsChoose[2].card
                    && cardsChoose[0].card === cardsChoose[3].card){
                    return true;
                }
            }
            return false;
        },
        wongFried:function(){
            var length = cardsChoose.length,
                reg = /53|54/;
            if(length === 2){
                if(reg.test(cardsChoose[0].card) && reg.test(cardsChoose[1].card)){
                    return true;
                }
            }
            return false;
        }


    }
})();