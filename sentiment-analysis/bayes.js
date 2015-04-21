
var Storage = (function(Storage) {
	Storage._data = {};

	Storage.setItem = function(k,v) {
		Storage._data[k] = v;
		return Storage;
	};

	Storage.getItem = function(k) {
		if (typeof Storage._data[k] === 'undefined')
			return null;
		return Storage._data[k];
	};

	return Storage;
})(Storage || {});


var Bayes = (function (Bayes) {

		var docCountKey = function (category) {
				return '_Bayes::docCount:' + category;
		};
    var stemKey = function (stem, category) {
        return '_Bayes::stem:' + stem + '::category:' + category;
    };
    var stemCountKey = function (stem) {
        return '_Bayes::stemCount:' + stem;
    };

    var log = function (text) {
      //  console.log(text);
    };

    var getCategories = function () {
        var categories = Bayes.storage.getItem('_Bayes::registeredCategories');
        if (!categories) categories = '';
        return categories.split(',').filter(function (a) {
            return a.length;
        });
    };

    var registerCategory = function (category) {
        var categories = getCategories();
        if (categories.indexOf(category) === -1) {
						categories.push(category);
            Bayes.storage.setItem('_Bayes::registeredCategories', categories.join(','));
        }
        return true;
    };

    var stemCategoryCount = function (stem, category) {
        var count = parseInt(Bayes.storage.getItem(stemKey(stem, category)));
        if (!count) count = 0;
        return count;
    };

    var stemInverseCategoryCount = function (stem, category) {
        var categories = getCategories();
        var total = 0;
        for (var i = 0, length = categories.length; i < length; i++) {
            if (categories[i] === category)
                continue;
            total += parseInt(stemCategoryCount(stem, categories[i]));
        }
        return total;
    };

    var stemTotalCount = function (stem) {
        var count = parseInt(Bayes.storage.getItem(stemCountKey(stem)));
        if (!count) count = 0;
        return count;
    };

    var docCount = function (category) {
        var count = parseInt(Bayes.storage.getItem(docCountKey(category)));
        if (!count) count = 0;
        return count;
    };

    var docInverseCount = function (category) {
        var categories = getCategories();
        var total = 0;
        for (var i = 0, length = categories.length; i < length; i++) {
            if (categories[i] === category)
                continue;
            total += parseInt(docCount(categories[i]));
        }
        return total;
    };

    var increment = function (key) {
        var count = parseInt(Bayes.storage.getItem(key));
        if (!count) count = 0;
        Bayes.storage.setItem(key, parseInt(count) + 1);
        return count + 1;
    };

    var incrementStem = function (stem, category) {
        increment(stemCountKey(stem));
        increment(stemKey(stem, category));
    };

    var incrementDocCount = function (category) {
        return increment(docCountKey(category));
    };

    Bayes.unigramTokenizer = function (text) {
	    text = text.toLowerCase().replace(/'/g, '').replace(/\W/g, ' ').replace(/\s+/g, ' ').trim().split(' ');
	    return text;
    };

    Bayes.tokenizer = Bayes.unigramTokenizer;

    Bayes.storage = localStorage;

    Bayes.train = function (text, category) {
				registerCategory(category);
        var words = Bayes.tokenizer(text);
        var length = words.length;
        for (var i = 0; i < length; i++)
            incrementStem(words[i], category);
        incrementDocCount(category);
    };

    Bayes.guess = function (text) {
        var words = Bayes.tokenizer(text);
        var length = words.length;
        var categories = getCategories();
        var totalDocCount = 0;
        var docCounts = {};
        var docInverseCounts = {};
        var scores = {};
        var categoryProbability = {};

        for (var j = 0; j < categories.length; j++) {
            var category = categories[j];
            docCounts[category] = docCount(category);
            docInverseCounts[category] = docInverseCount(category);
            totalDocCount += parseInt(docCounts[category]);
        }

        for (var j = 0; j < categories.length; j++) {
            var category = categories[j];
            var logSum = 0;
						categoryProbability[category] = docCounts[category] / totalDocCount;

            for (var i = 0; i < length; i++) {
                var word = words[i];
                var _stemTotalCount = stemTotalCount(word);
                if (_stemTotalCount === 0) {
                    continue;
                } else {
                    var wordProbability = stemCategoryCount(word, category) / docCounts[category];
                    var wordInverseProbability = stemInverseCategoryCount(word, category) / docInverseCounts[category];
                    var wordicity = wordProbability / (wordProbability + wordInverseProbability);

										/* RARE WORDS ADJUSTMENT */

										wordicity = ((3*0.5) + (_stemTotalCount*wordicity)) / (3 + _stemTotalCount);

										// to avoid weird logs
                    if (wordicity === 0)
                        wordicity = 0.00001;
                    else if (wordicity === 1)
                        wordicity = 0.99999;
               }
								logSum += (Math.log(1 - wordicity) - Math.log(wordicity));
                log(category + "icity of " + word + ": " + wordicity);
            }
            scores[category] = 1 / ( 1 + Math.exp(logSum) );
        }
        return scores;
    };

    Bayes.getClassification = function (scores) {
        var bestScore = 0;
        var bestCategory = null;
        for (var category in scores) {
            if (scores[category] > bestScore) {
                bestScore = scores[category];
                bestCategory = category;
            }
        }
        return {category: bestCategory, score: bestScore};
    };

    return Bayes;
})(Bayes || {});
