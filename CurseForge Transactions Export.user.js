// ==UserScript==
// @name         Cursed Transactions Export
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  try to take over the world!
// @author       Snownee
// @match        https://authors.curseforge.com/store/transactions*
// @connect      cdn.jsdelivr.net
// @connect      authors.curseforge.com
// @require      https://cdn.jsdelivr.net/npm/jquery@3.4.0/dist/jquery.min.js
// @grant     GM.registerMenuCommand
// @grant     GM_xmlhttpRequest
// @homepage     https://github.com/Snownee/CursedTransactionsExport
// ==/UserScript==

var days = 300;
var transactionsPerRequest = 50;

(function() {
    GM.registerMenuCommand('Export Transactions', exportData)
})();

function makeGetRequest(url) {
    return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            method: "GET",
            url: url,
            onload: function(response) {
                resolve(response.responseText);
            },
            onerror: function(error) {
                reject(error);
            }
        });
    });
}

async function exportData(){
    let curDate = new Date()
    let destDate = new Date(curDate.getTime() - (days * 24 * 60 * 60 * 1000))
    let award
    let sheet = []
    let reqCtx = {
        queue: [],
        index: 0,
        noMore: false
    }
    let cols = ['date', 'total']

    while(curDate > destDate) {
        if (award == null) {
            award = await nextAward(reqCtx)
            if (award == null) {
                break
            }
        }
        let dayData = { date: curDate.getFullYear() + '/' + (curDate.getMonth()+1) + '/' + curDate.getDate() }
        if (sameDay(award.date, curDate)) {
            dayData.total = $('.toggle strong', award.award)[0].innerHTML
            let items = $('.sub-reward-item li', award.award)
            for (let i = 0; i < items.length; ++i) {
                let item = items[i]
                let project = $('a', item)[0].innerHTML
                dayData[project] = $('b', item)[0].innerHTML
                if (!cols.includes(project)) {
                    cols.push(project)
                }
            }
            award = null
        }
        sheet.push(dayData)
        curDate = new Date(curDate.getTime() - 24 * 60 * 60 * 1000)
    }
    sheet = sheet.reverse()
    //console.log(sheet)
    genCSV(cols, sheet)
}

function genCSV(cols, sheet) {
    let csv = ''
    let first = cols[0]
    for (let col of cols) {
        if (col !== first) {
            csv += ','
        }
        csv += col.replaceAll(',', '')
    }
    csv += '\n'
    for (let o of sheet) {
        for (let col of cols) {
            if (col !== first) {
                csv += ','
            }
            let v = o[col]
            if (v == null) {
                v = '0'
            }
            csv += v.replaceAll(',', '')
        }
        csv += '\n'
    }
    console.log(csv)
    let a = document.createElement("a");
    a.href = "data:text," + csv;   //content
    a.download = "PointsData-" + days + "Days.csv";            //file name
    a.click();
}

async function nextAward(ctx) {
    if (ctx.queue.length > 0) {
        return ctx.queue.shift()
    }
    if (ctx.noMore) {
        return null
    }
    console.log('Fetching... ' + (ctx.index + transactionsPerRequest))
    let data = await makeGetRequest(`https://authors.curseforge.com/store/transactions-ajax/${ctx.index}-${transactionsPerRequest}-7`)
    ctx.index += transactionsPerRequest
    let root = $.parseHTML(`<div>${data}</div>`)
    let transactions = $('.transactions', root)
    let l = transactions.length
    if (l == 0) {
        return null
    }
    if (l < transactionsPerRequest) {
        ctx.noMore = true
    }
    for (let i = 0; i < l; ++i) {
        let transaction = transactions[i]
        let award = $('.award', transaction)
        if (award.length === 0) {
            continue
        }
        award = award[0]
        let date = new Date($('h3 .standard-date', transaction)[0].title)
        ctx.queue.push({ date, award })
    }
    return ctx.queue.shift()
}

function sameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
}