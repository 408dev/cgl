// Хелпер для конектів на 408 сервер
// 		Депенд: Alert, Toast, I18n
import Toast from 'react-native-simple-toast';
import {Alert} from 'react-native';
import I18n from 'react-native-i18n';

import Menu from './components/menu';

var connectDebugMode = false;

class Connect408
{
	// Як обробляти ексепшн?
	static Silent = 0;
	static Alert = 1;
	static Toast = 2;

	static parseCode(code)
	{
		if (code == 404)
			return I18n.t('errorNotFound');
		else if (code == 504)
			return I18n.t('errorTimeout');
		return I18n.t('errorUnavailable');
	}

	static fetch(url, data, options)
	{
		options = options || {};

		if (data && Object.keys(data).length == 0)
			data = false;

		var method = options.method ? options.method : (data?'POST':'GET');
		var notify = options.exc || Connect408.Toast;

		var headers = {};
		if (options.json)
			headers['Accept'] = 'application/json';
		if (data && method == 'POST')
			headers['Content-Type'] = 'application/x-www-form-urlencoded';

		var body = "";
		if (data && method == 'POST')
			body = "request_data=" + encodeURIComponent( JSON.stringify(data) );

		var params = {method, headers};
		if (body)
			params.body = body;

		if (options.lang && url)
			url += ((url.indexOf("?") !== -1)?"&":"?") + "lang=" + options.lang;

		if (!options.silentLoad)
			Toast.show( options.loadingText || I18n.t('loading') );

		if (connectDebugMode)
		{
			console.log("Fetching: " + url);
			console.log(params);
		}

		// Хелпер для таймауту
		function timeoutPromise(timeout, promise)
		{
  			return new Promise(function(resolve,reject)
  			{
    			promise.then(resolve,reject);
    			setTimeout(reject.bind(null, -1), timeout);
  			});
		}

		var a = timeoutPromise( options.timeout || 20000 , fetch( url, params ) );

		a = a.then( response => 
		{ 
			if (response.status != 200) 
				throw new Error(response.statusText?response.statusText:Connect408.parseCode(response.status)); 
			return response; 
		});

		if (options.json)
		{
			a = a.then( response => {
	 			if (connectDebugMode)
	 				console.log(response._bodyInit);
				return response.json();
			}).then(responseData => 
			{
	 			if (connectDebugMode)
	 				console.log(responseData);
				if (!responseData)
					throw new Error(I18n.t('errorEmptyAnswer'));
				else if (responseData.error && !responseData.data)
					throw new Error(responseData.error);
				else
					return Promise.resolve(responseData);
			});
		}

		a = a.catch( e => 
 		{
 			var timedOut = false;
 			if (e === -1)
 			{
 				timedOut = true;
 				e = new Error(I18n.t('errorTimeout'))
 			}

 			if (options.onTimeout && timedOut)
 			{
	 			if (connectDebugMode)
	 				console.log("Exception: connection timeout");

 				options.onTimeout();
 				return;
 			}

 			if (options.onFail)
 				options.onFail();

 			var emsg = e.message?e.message:"";
 			var relogin = false;
 			if (emsg == "relogin")
 			{
 				relogin = true;
 				emsg = I18n.t('errorRelogin');
 			}

			var txt = (options.excMsg || I18n.t('errorConnectionError'))  + (emsg?("\n ( " + emsg + " )"):"");
			txt = emsg?emsg:txt;

 			if (connectDebugMode)
 				console.log("Exception: " + txt);

 			if (!this.isAlertShown)
 			{
				if (notify & Connect408.Toast && !relogin)
	 				Toast.show( txt );

				if (notify & Connect408.Alert || relogin)
				{
					this.isAlertShown = true;
					Alert.alert( options.alertTitle || I18n.t('errorConnectionError'), txt, 
						[ { text: options.alertOK || I18n.t('buttonOK'), 
							onPress: () => 
							{
								this.isAlertShown = false;
								if (relogin)
									(new Menu({})).doLogout(true);
							} } ], {cancelable: false} );
				}
			}
 		});

 		return a;
	}
	static fetchJSON(url, data, options)
	{
		options = options || {};
		options.json = true;
		return Connect408.fetch(url, data, options);
	}
}

module.exports = Connect408;