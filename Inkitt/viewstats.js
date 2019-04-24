/* Сторінка алертів */

// Імпорти
import React, { Component } from 'react';
import {
  ScrollView,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Alert,
  processColor,
  View
} from 'react-native';
import {styles, colors, chartOptions, stuff} from '../styles';
import InfoBlock from "../components/infoblock";
import Person from "../components/person";
import I18n from 'react-native-i18n';
import ActionBar from 'react-native-action-bar';
import Config from '../config';
import settings from '../settings';
import Toast from 'react-native-simple-toast';
import { Table, Row, Rows } from 'react-native-table-component';
import {LineChart, BarChart, PieChart} from 'react-native-charts-wrapper';
import {ButtonGroup} from 'react-native-elements';
import Connect408 from "../connect408";
import Helper from "../helper";
import Events from '../events';
import { Dialog } from 'react-native-simple-dialogs';
import { Calendar } from 'react-native-calendars';
import { TextField } from 'react-native-material-textfield';

// Клас сторінки алерту
export default class ViewStatsPage extends Component<{}>
{
	// Конструктор - ініціалізуємо стан
  	constructor(props)
  	{
    	super(props);

    	let now = new Date();
    	this.state =    
    	{
    		// ["Breaks", "Components", "Time", "Goals", "SuccessRate", "Players", "Coaches", "Admin"]
    		type: "Breaks",
    		routineID: false,
    		routineTitle: "",
    		busy: false,
    		error: false,
    		periodSelected: 0,
    		endDate: now.toYMD(),
    		startDate: now.addMonths(-1).toYMD(),
    		periodSelectorShown: false,
    		showDateDlg: false,
    		startDateDlg: false,
    		noFilter: false,

    		charts: []
    	};
    	if (this.props && this.props.navigation && this.props.navigation.state.params)
    	{
    		this.state.type = this.props.navigation.state.params.type;
    		this.state.routineID = this.props.navigation.state.params.routineID;
    		this.state.routineTitle = this.props.navigation.state.params.routineTitle;    		
    	}

    	// Для адмінів поуказуємо своє
    	this.state.noFilter = this.state.type == "Admin";
  	}

  	componentDidMount()
  	{
		this.fetchData();
  	}

  	// Готуємо чарти (options = {type: ["breaks"|"shots"|"clearances"|"time"], "maxbreak": bool})
  	prepareChart(data, options)
  	{
  		if (!data)
  			return null;

  		options = options ? options : {};

  		// Для цілей приходять обидва типи в обєкті - фільтруємо потрібний за індексом "subtype"
  		if (options.type == "goals")
  		{
  			data = data[options.subtype];
  			if (!data)
  				return null;
  		}

		let xAxis = Object.assign({},chartOptions.line.xAxis);					
		let yAxis = Object.assign({},chartOptions.line.yAxis);					
		let config = Object.assign({},chartOptions.line.blueLineConfig);					
		config.color = colors.chartColors[options.maxbreak?1:0];
		config.mode = "HORIZONTAL_BEZIER";
			
		let values = [];
		let valueFormatter = [];
		let label = "";
		for (let k in data)
		{
			valueFormatter.push(k);
			let yval = 0;
			let marker = "";
			if (options.type == "breaks")
			{
				config.valueFormatter = "#";
				label = I18n.t("statsChartBreaks");

				if (options.maxbreak)
					yval = data[k].maxparam1;
				else
					yval = data[k].cnt ? (data[k].param1/data[k].cnt) : 0;
				marker = Math.floor(yval).toString() + I18n.t("statsBreaksTries").replace("#", data[k].cnt);
			}
			else if (options.type == "shots")
			{
				label = I18n.t("statsChartShots");
				yval = data[k].param1.getPerc(data[k].param1 + data[k].param2);
				marker = yval + "%" + I18n.t("statsBreaksTries").replace("#", data[k].cnt);
			}
			else if (options.type == "clearances")
			{
				config.valueFormatter = "#";
				yAxis.left = yAxis.right = 
				{
					granularityEnabled: true,
					granularity: 1,
					valueFormatter: "#"
				};

				yval = data[k].param2;
				marker = Math.floor(yval).toString() + I18n.t("statsBreaksTries").replace("#", data[k].cnt);
			}
			else if (options.type == "time")
			{
				config.valueFormatter = "#";

				yval = data[k].mins;
				marker = I18n.t("dashboardInfoTime").replace("#", Math.floor(yval));
			}
			else if (options.type == "goals")
			{
				config.valueFormatter = "#";

				yval = parseFloat(data[k]);
				marker = data[k].toString() + ((options.routine_type == settings.eventItemRoutineShots)?"%":"");
			}
			values.push({y: yval, marker});
		}
		xAxis.valueFormatter = valueFormatter;
		xAxis.enabled = true;

		if (!values.length)
			return null;
		let dataSets = [{ values, label, config }];

		// Якщо є цілі та стабільність - малюємо їх графіками
		let hasGoals = false;
		let goalLines = ["goals", "stability"];
		for (let gl of goalLines)
			if (options[ gl ])
			{
				hasGoals = true;
				let goalsValues = [];
				// Для каждого икса проверяем значение в целях - если есть - рисуем точку
				for (let xval of valueFormatter)
				{
					let y = options[gl][xval] ? options[gl][xval] : 0;
					goalsValues.push({y, marker: I18n.t("dashboardRoutineGoalShort").replace("#", y) }) 
				}
				let configGoals = Object.assign({},chartOptions.line.redLineConfig);
				if (gl != "goals")
					configGoals.color = colors.chartColors[3];	// оранжевий для стабільності
				dataSets.push({values: goalsValues, label: I18n.t( (gl != "goals") ? "statsChartStability" : "statsChartGoal"), config: configGoals});
			}

		let chartData = {dataSets};
		let chart = null;

		if (options.type == "clearances" || options.type == "time")
			chart = <BarChart
	            style={styles.chart}
	            data={chartData}
	            xAxis={xAxis}
	            yAxis={yAxis}
	            animation={{durationX: 300}}
	            legend={{enabled:hasGoals}}
	            drawBarShadow={false}
	            drawValueAboveBar={true}
	            drawHighlightArrow={true}
	            marker={{enabled: true, markerColor: processColor(colors.mainColor), textColor: processColor(colors.backColor)}}
	            onSelect={() => {}}
	            chartDescription={{text: ""}}
	            onChange={(event) => {}}
          />;
		else
			chart = <LineChart
				style={styles.chart}
	            data={chartData}
	            xAxis={xAxis}
	            yAxis={chartOptions.line.yAxis}
	            chartDescription={{text: ""}}
	            legend={{enabled: hasGoals, position: "ABOVE_CHART_LEFT"}}
	            marker={{enabled: true, markerColor: processColor(colors.mainColor), textColor: processColor(colors.backColor)}}
	            onSelect={() => {}}
	            onChange={(event) => {}}/>;  

        return chart;		
  	}

  	fetchData()
  	{
  		const {navigate} = this.props.navigation;
  		if (this.state.busy)
  			return;

		this.setState({busy: true, error: false});

		// Якщо успішність тренувань - ліземо за календарем
		if (this.state.type == "SuccessRate")
		{
			Events.fire("FetchCalendar", {onResult: (result) => 
			{
				if (!result)
				{					
					this.setState({busy: false, error: I18n.t("statsSuccessRateLoadError")});
					return;
				}

				let charts = [];
				var tableMarketsHead = [ I18n.t("statsTableEventDate"), I18n.t("statsTableEventLong"), I18n.t("statsTableEventRate") ];
        		var tableMarketsData = [];

				let actype = Helper.convertAccountType(Config.userSettings.defaultAccountType);
				let items = Config[ actype + 'Calendar' ];

				if (items)
					for (let dt in items)
						for (let item of items[dt])
						{
							if (dt >= this.state.startDate && dt <= this.state.endDate && item.state == settings.eventStateDone && 
								(item.type_id == settings.eventPersonalTraining || item.type_id == settings.eventGroupTraining || item.type_id == settings.eventWarmup))
							{
								let long = item.time_long ? (Math.floor(item.time_long/60) + " " + I18n.t("generalMinutesShort")) : "-";

								let srate = "-";
						      	if (item.srate)
						      	{
						      		let tTotal = 0;
						      		let tSuccess = 0;
						      		for (let k in item.srate)
						      		{
						      			tTotal += item.srate[k].total;
						      			tSuccess += item.srate[k].success;
						      		}
						      		let successRate = tSuccess.getPerc(tTotal);
						      		let successValue = Math.floor( successRate ) + "%";
						      		srate = I18n.t("calendarEventSuccessRateTitle") + ": " + I18n.t("calendarEventSuccessRate").replace("#", successValue).replace("@", tSuccess).replace("!", tTotal);
						      	}

						      	ndt = <TouchableOpacity onPress={() => 
					      		{
							  		navigate('ViewEventPage', {item, refreshCal: this.fetchData.bind(this)});
					      		}}><Text style={{margin: 5, textDecorationLine: "underline", color: colors.mainColor}}>{dt}</Text></TouchableOpacity>;
						      	tableMarketsData.push([ndt, long, srate]);
							}
						}

				if (tableMarketsData.length)
	        		charts.push({title: false, chart: 
	        			<Table style={styles.marginBottom20}>
	          				<Row data={tableMarketsHead} style={styles.tableHead} textStyle={[styles.tableText, {fontWeight: 'bold'}]}/>
	          				<Rows data={tableMarketsData} style={styles.tableRow} textStyle={styles.tableText}/>
	        			</Table>});
        		this.setState({busy: false, charts});
			}});
			return;
		}
		else if (this.state.type == "Players" || this.state.type == "Coaches")
		{
			// Статистика гравців
			let searchList = (this.state.type == "Coaches") ? Config.userData.lists.academyCoaches : 
				Config.userData.lists[ (Config.userSettings.defaultAccountType == settings.accountCoach) ? "coachPlayers" : "academyPlayers"];
			if (searchList)
				Events.fire("FetchCalendar", {onResult: (result) => 
				{
					if (!result)
					{					
						this.setState({busy: false, error: I18n.t("statsSuccessRateLoadError")});
						return;
					}

					let charts = [];

					// Збираємо наступні заплановані тренування
					let actype = Helper.convertAccountType(Config.userSettings.defaultAccountType);
					let items = Config[ actype + 'Calendar' ] || [];

					let sDate = new Date();
					sDate.setDate(sDate.getDate() - 30);
					sDate = sDate.toYMD();
					let eDate = (new Date()).toYMD();

					// Бігаємо по персонах
					for (let it of searchList)
					{
						it.contactStatus = "Normal";
						charts.push({person: it});

						let events = [];
						let eventTypes = {};
						let eventsLastMonth = 0;
						let eventsAll = 0;
						let firstEvent = false;
						for (let dt in items)
							for (let item of items[dt])
								if (item.author_id == it.id || (item.target_ids && item.target_ids.indexOf(" " + it.id + " ") >= 0))
								{
									if (item.state == settings.eventStateNormal)
									{
										let eventPlayers = item.target_ids.trim().split(" ").length;
										events.push([
											(<TouchableOpacity onPress={() => 
				      							{
						  							navigate('ViewEventPage', {item, refreshCal: this.fetchData.bind(this)});
				      							}}><Text style={{margin: 5, textDecorationLine: "underline", color: colors.mainColor}}>{dt + " (" + item.time_start + "-" + item.time_end + ")"}</Text></TouchableOpacity>),
											I18n.t('eventType' + item.type_id) + ((item.type_id == settings.eventGroupTraining)?I18n.t("statsTableEventPersons").replace( "#", eventPlayers ):"")
										]);
									}
									else if (item.state == settings.eventStateDone)
									{
										if (!firstEvent)
											firstEvent = dt;

										if (!eventTypes["t" + item.type_id])
											eventTypes["t" + item.type_id] = {type: I18n.t('eventType' + item.type_id), cnt: 0};
										eventTypes["t" + item.type_id].cnt++;

										eventsAll++;
										if (dt >= sDate && dt <= eDate)
											eventsLastMonth++;
									}
								}

						if (events.length)
						{
							let tableMarketsHead = [I18n.t("statsTableEventDate"), I18n.t("statsTableEventType") ];
			        		charts.push({title: I18n.t("statsCoachesNextEvents"), chart: 
			        			<Table style={styles.marginBottom20}>
			          				<Row data={tableMarketsHead} style={styles.tableHead} textStyle={[styles.tableText, {fontWeight: 'bold'}]}/>
			          				<Rows data={events} style={styles.tableRow} textStyle={styles.tableText}/>
			        			</Table>});
						}

						let tableMarketsHead = [I18n.t("statsTableItem"), I18n.t("statsTableDate") ];
						let eventsData = [];
						eventsData.push([I18n.t("statsTableEventsAll"), eventsAll]);
						for (let et in eventTypes)
							eventsData.push([eventTypes[et].type, eventTypes[et].cnt]);
						eventsData.push([I18n.t("statsTableEventsLastMonth"), eventsLastMonth]);
						eventsData.push([I18n.t("statsTableEventsFirst"), firstEvent]);

		        		charts.push({title: I18n.t("statsTableEvents"), chart: 
		        			<Table style={styles.marginBottom20}>
		          				<Row data={tableMarketsHead} style={styles.tableHead} textStyle={[styles.tableText, {fontWeight: 'bold'}]}/>
		          				<Rows data={eventsData} style={styles.tableRow} textStyle={styles.tableText}/>
		        			</Table>});

						this.setState({busy: false, charts, noFilter: true});
					}

				}});
			return;
		}
		else if (this.state.type == "Admin")
		{
			// Вся інформація по проекту для супер-адміна
			Connect408.fetchJSON(settings.root_url + settings.actions.get_stats, 
				{
					logincode: Config.userData.logincode,
					type: this.state.type
				},
				{onFail: () => { this.setState({busy: false, error: I18n.t("errorConnectionError")}); }})
			.then( responseData => 
			{
				this.setState({busy: false});
				if (responseData && responseData.result && responseData.data)
				{
					// Готуємо блоки статистики
					let charts = [];
					//try
					{
						// Загальна інформація
						let data = responseData.data.general;
						if (data)
						{
							let tableMarketsHead = [ I18n.t("statsTableItem"), I18n.t("statsTableDate") ];
			        		let tableMarketsData = 
			        		[
			        			[ I18n.t("statsAdminGeneralPlayers"), data.players ],
			        			[ I18n.t("statsAdminGeneralActivePlayers"), data.active_players ],
			        			[ I18n.t("statsAdminGeneralCoaches"), data.coaches ],
			        			[ I18n.t("statsAdminGeneralAcademies"), data.academies ],
			        			[ I18n.t("statsAdminGeneralEvents"), data.events ],
			        			[ I18n.t("statsAdminGeneralTrainings"), data.trainings ],
			        			[ I18n.t("statsAdminGeneralRoutines"), data.routines ],
			        			[ I18n.t("statsAdminGeneralActiveRoutines"), data.active_routines ]
			        		];

			        		charts.push({title: I18n.t("statsAdminGeneral"), chart: 
			        			<Table style={styles.marginBottom20}>
			          				<Row data={tableMarketsHead} style={styles.tableHead} textStyle={[styles.tableText, {fontWeight: 'bold'}]}/>
			          				<Rows data={tableMarketsData} style={styles.tableRow} textStyle={styles.tableText}/>
			        			</Table>});
		        		}

						// ТОП вправи
		        		data = responseData.data.routines;
						if (data && data.length)
						{
							let chartData = 
							{
								dataSets: 
								[{
									values: data.filter((e,i) => i < 8 ).map(e => { return {value: parseInt(e.cnt), label: e.title}; }),
					        		label: '',
	          						config: 
	          						{
	            						colors: colors.chartColors,
	            						valueTextSize: 16,
	            						valueTextColor: processColor(colors.backColor),
	            						sliceSpace: 5,
	            						selectionShift: 13,
	            						valueFormatter: "#.00 '%'"
	          						}
	          					}]
        					};
							charts.push({title: I18n.t("statsAdminTopRoutines"), chart: (<PieChart
						            style={styles.chart}
						            chartDescription={{text: ""}}
						            data={chartData}
						            legend={{enabled: true, textSize: 8, form: 'CIRCLE', position: 'RIGHT_OF_CHART', wordWrapEnabled: true}}
						            highlights={[]}
						            rotationEnabled={true}
						            rotationAngle={45}
						            usePercentValues={true}
						            drawEntryLabels={false}
						            maxAngle={360}
						            holeRadius={5}
						            transparentCircleRadius={0}
						            onSelect={(e) => {if (e.nativeEvent) {Toast.show(e.nativeEvent.label);}}}
						            onChange={(e) => {}}/>)
					        });
						}

						// Покриття тренерами та академіями учнів
		        		data = responseData.data.players;
						if (data)
						{
							let chartData = 
							{
								dataSets: 
								[{
									values: 
									[
										{value: data.alone_players, label: I18n.t("statsAdminPlayersAlone") + " (" + data.alone_players + ")"},
										{value: data.players_coaches, label: I18n.t("statsAdminPlayersCoaches") + " (" + data.players_coaches + ")"},
										{value: data.players_academies, label: I18n.t("statsAdminPlayersAcademies") + " (" + data.players_academies + ")"},
										{value: data.players_both, label: I18n.t("statsAdminPlayersBoth") + " (" + data.players_both + ")"},
									],
					        		label: '',
	          						config: 
	          						{
	            						colors: colors.chartColors,
	            						valueTextSize: 16,
	            						valueTextColor: processColor(colors.backColor),
	            						sliceSpace: 5,
	            						selectionShift: 13,
	            						valueFormatter: "#.00 '%'"
	          						}
	          					}]
        					};
							charts.push({title: I18n.t("statsAdminPlayers"), chart: (<PieChart
						            style={styles.chart}
						            chartDescription={{text: ""}}
						            data={chartData}
						            legend={{enabled: true, textSize: 8, form: 'CIRCLE', position: 'RIGHT_OF_CHART', wordWrapEnabled: true}}
						            highlights={[]}
						            rotationEnabled={true}
						            rotationAngle={45}
						            usePercentValues={true}
						            drawEntryLabels={false}
						            maxAngle={360}
						            holeRadius={5}
						            transparentCircleRadius={0}
						            onSelect={(e) => {if (e.nativeEvent) {Toast.show(e.nativeEvent.label);}}}
						            onChange={(e) => {}}/>)
					        });
						}

						// ТОП академії
		        		data = responseData.data.academies;
						if (data && data.length)
						{
							let chartData = 
							{
								dataSets: 
								[{
									values: data.filter((e,i) => i < 8 ).map(e => { return {value: parseInt(e.players), label: e.name + I18n.t("statsTableEventPersons").replace("#", e.players)}; }),
					        		label: '',
	          						config: 
	          						{
	            						colors: colors.chartColors,
	            						valueTextSize: 16,
	            						valueTextColor: processColor(colors.backColor),
	            						sliceSpace: 5,
	            						selectionShift: 13,
	            						valueFormatter: "#.00 '%'"
	          						}
	          					}]
        					};
							charts.push({title: I18n.t("statsAdminTopAcademies"), chart: (<PieChart
						            style={styles.chart}
						            chartDescription={{text: ""}}
						            data={chartData}
						            legend={{enabled: true, textSize: 8, form: 'CIRCLE', position: 'RIGHT_OF_CHART', wordWrapEnabled: true}}
						            highlights={[]}
						            rotationEnabled={true}
						            rotationAngle={45}
						            usePercentValues={true}
						            drawEntryLabels={false}
						            maxAngle={360}
						            holeRadius={5}
						            transparentCircleRadius={0}
						            onSelect={(e) => {if (e.nativeEvent) {Toast.show(e.nativeEvent.label);}}}
						            onChange={(e) => {}}/>)
					        });
						}

						// Гістограма реєстрацій за місяць
		        		data = responseData.data.users;
						if (data)
						{
							let xAxis = Object.assign({},chartOptions.line.xAxis);					
							let yAxis = Object.assign({},chartOptions.line.yAxis);					
							let config = Object.assign({},chartOptions.line.blueLineConfig);					
							config.color = colors.chartColors[0];
								
							let values = [];
							let valueFormatter = [];
							let label = "";

							for (let k in data)
							{
								config.valueFormatter = "#";
								yAxis.left = yAxis.right = 
								{
									granularityEnabled: true,
									granularity: 1,
									valueFormatter: "#"
								};

								yval = parseInt(data[k]);
								marker = I18n.t("statsAdminUsersRegistrationLabel").replace("#", k).replace("@", yval);
								values.push({y: yval, marker});
								valueFormatter.push(k);
							}
							xAxis.valueFormatter = valueFormatter;
							xAxis.enabled = true;
							let dataSets = [{ values, label, config }];

							charts.push({title: I18n.t("statsAdminUsersRegistration"), chart: (<BarChart
					            style={styles.chart}
					            data={{dataSets}}
					            xAxis={xAxis}
					            yAxis={yAxis}
					            animation={{durationX: 300}}
					            legend={{enabled:false}}
					            drawBarShadow={false}
					            drawValueAboveBar={true}
					            drawHighlightArrow={true}
					            marker={{enabled: true, markerColor: processColor(colors.mainColor), textColor: processColor(colors.backColor)}}
					            onSelect={() => {}}
					            chartDescription={{text: ""}}
					            onChange={(event) => {}}/>)
							});
						}

						// Гістограма тренувань за місяць
		        		data = responseData.data.trainings;
						if (data)
						{
							let xAxis = Object.assign({},chartOptions.line.xAxis);					
							let yAxis = Object.assign({},chartOptions.line.yAxis);					
							let config = Object.assign({},chartOptions.line.blueLineConfig);					
							config.color = colors.chartColors[1];
								
							let values = [];
							let valueFormatter = [];
							let label = "";

							for (let k in data)
							{
								config.valueFormatter = "#";
								yAxis.left = yAxis.right = 
								{
									granularityEnabled: true,
									granularity: 1,
									valueFormatter: "#"
								};

								yval = parseInt(data[k]);
								marker = I18n.t("statsAdminTrainingsLabel").replace("#", k).replace("@", yval);
								values.push({y: yval, marker});
								valueFormatter.push(k);
							}
							xAxis.valueFormatter = valueFormatter;
							xAxis.enabled = true;
							let dataSets = [{ values, label, config }];

							charts.push({title: I18n.t("statsAdminTrainings"), chart: (<BarChart
					            style={styles.chart}
					            data={{dataSets}}
					            xAxis={xAxis}
					            yAxis={yAxis}
					            animation={{durationX: 300}}
					            legend={{enabled:false}}
					            drawBarShadow={false}
					            drawValueAboveBar={true}
					            drawHighlightArrow={true}
					            marker={{enabled: true, markerColor: processColor(colors.mainColor), textColor: processColor(colors.backColor)}}
					            onSelect={() => {}}
					            chartDescription={{text: ""}}
					            onChange={(event) => {}}/>)
							});
						}
					}
					//catch (e){}
					this.setState({charts});
				}
				else
					this.setState({error: responseData.error || I18n.t("errorConnectionError")});
			});
			return;
		}

		Connect408.fetchJSON(settings.root_url + settings.actions.get_stats, 
			{
				logincode: Config.userData.logincode,
				role: Config.userSettings.defaultAccountType,
				type: this.state.type,
				start_date: this.state.startDate,
				end_date: this.state.endDate,
				routine_id: this.state.routineID				
			},
			{onFail: () => { this.setState({busy: false}); }})
		.then( responseData => 
		{
			this.setState({busy: false});
			if (responseData && responseData.result && responseData.data)
			{
				// Готуємо чарти
				let charts = [];

				for (let d in responseData.data)
				{
					data = responseData.data[d];
					if (!data)
						continue;

					// Для тренера и академии - отображаем кликабельного ученика
					if (Config.userSettings.defaultAccountType != settings.accountPlayer)
					{
						let searchList = Config.userData.lists[ (Config.userSettings.defaultAccountType == settings.accountCoach) ? "coachPlayers" : "academyPlayers"];
						let person = null;
						if (searchList)
						{
							person = searchList.find(e => ("a" + e.id) == d);
							if (person)
							{
								person.contactStatus = "Normal";
								charts.push({person});
							}
						}
						
					}

					if (this.state.type == "Breaks")
					{
						// Середні брейки
						let chart = this.prepareChart(data.stats, {type: "breaks", goals: data.goals, stability: data.stability});
						if (chart)
							charts.push({title: I18n.t("statsBreaksAvg"), chart});

						// Кращі брейки
						chart = this.prepareChart(data.stats, {type: "breaks", "maxbreak": true, goals: data.goals, stability: data.stability});
						if (chart)
							charts.push({title: I18n.t("statsBreaksMax"), chart});

						// Кліренси
						chart = this.prepareChart(data.stats, {type: "clearances"});
						if (chart)
							charts.push({title: I18n.t("statsBreaksClearance"), chart});

						// Таблиця даних
						try
						{					
							var tableMarketsHead = [ I18n.t("statsTableItem"), I18n.t("statsTableDate") ];
			        		var tableMarketsData = 
			        		[
			        			[ I18n.t("statsBreaksMaxBreak"), data.accum.max.value + " (" + data.accum.max.date + ")" ],
			        			[ I18n.t("statsBreaksMinBreak"), data.accum.min.value + " (" + data.accum.min.date + ")" ],
			        			[ I18n.t("statsBreaksMeanBreak"), parseInt(data.accum.avg) ],
			        			[ I18n.t("statsBreaksTriesAll"), data.accum.tries ],
			        			[ I18n.t("statsBreaksClearancesRate"), data.accum.clearances + " (" + data.accum.clearances.getPerc(data.accum.tries) + "%)" ],
			        		];

			        		
			        		let rd = false;
			        		// Добавляем цифру прогресса по упражнению (берем там же где и цель)
			        		if (this.state.routineID)
			        		{
								rd = Helper.getRoutineData(this.state.routineID);
								tableMarketsData.push([ I18n.t("statsBreaksComponentsProgress"), rd ? rd.progress : "-" ]);
			        		}

							// Добавляем лучший рекорд
			        		if (data.accum.best)
			        		{		        			
			        			let rt = (rd && rd.title) ? (", " + rd.title) : "";
			        			tableMarketsData.push([ I18n.t("statsBreaksPB"), data.accum.best.maxparam1 + " (" + data.accum.best.event_date + rt + ")" ]);
			        		}

			        		charts.push({title: I18n.t("statsBreaksTable"), chart: 
			        			<Table style={styles.marginBottom20}>
			          				<Row data={tableMarketsHead} style={styles.tableHead} textStyle={[styles.tableText, {fontWeight: 'bold'}]}/>
			          				<Rows data={tableMarketsData} style={styles.tableRow} textStyle={styles.tableText}/>
			        			</Table>});
		        		}
		        		catch (e){}
					}
					else if (this.state.type == "Components")
					{
						let chart = this.prepareChart(data.stats, {type: "shots", goals: data.goals, stability: data.stability});
						if (chart)
							charts.push({title: I18n.t("statsComponentsAvg"), chart});

						// Таблиця даних
						try
						{
							var tableMarketsHead = [ I18n.t("statsTableItem"), I18n.t("statsTableDate") ];
			        		var tableMarketsData = 
			        		[
			        			[ I18n.t("statsComponentsMaxRate"), data.accum.max.value + "% (" + data.accum.max.date + ")" ],
			        			[ I18n.t("statsComponentsMinRate"), data.accum.min.value + "% (" + data.accum.min.date + ")" ],
			        			[ I18n.t("statsComponentsAvgRate"), data.accum.avg + "%" ],
			        			[ I18n.t("statsComponentsTriesAll"), data.accum.tries ],
			        		];
			        		charts.push({title: I18n.t("statsComponentsTable"), chart: 
			        			<Table style={styles.marginBottom20}>
			          				<Row data={tableMarketsHead} style={styles.tableHead} textStyle={[styles.tableText, {fontWeight: 'bold'}]}/>
			          				<Rows data={tableMarketsData} style={styles.tableRow} textStyle={styles.tableText}/>
			        			</Table>});
		        		}
		        		catch (e){}
					}
					else if (this.state.type == "Time")
					{
						// Час тренувань
						let chart = this.prepareChart(data, {type: "time"});
						if (chart)
							charts.push({title: I18n.t("statsTimeAvg"), chart});
					}
					else if (this.state.type == "Goals")
					{
						// Цілі на брейки
						let chart = this.prepareChart(data, {type: "goals", subtype: "t" + settings.eventItemRoutineBreak, routine_type: settings.eventItemRoutineBreak});
						if (chart)
							charts.push({title: I18n.t("statsGoalsBreaks"), chart});

						// Цілі на удари
						chart = this.prepareChart(data, {type: "goals", subtype: "t" + settings.eventItemRoutineShots, routine_type: settings.eventItemRoutineShots});
						if (chart)
							charts.push({title: I18n.t("statsGoalsShots"), chart});
					}
					this.setState({charts});
				}
			}
			else
				this.setState({charts: []});
		});
  	}

	// Малюємо сторінку
	render()
	{		
		const {goBack, navigate} = this.props.navigation;
    	return (
      		<View style = {styles.container}>

	    		<ActionBar
	        		backgroundColor = {colors.mainColor}
	        		containerStyle = {styles.bar}
	        		title = { this.state.routineTitle || I18n.t('stats' + this.state.type) }
		            titleStyle = { { alignSelf: 'center' } }
		            leftIconName = {'back'}
		            onLeftPress = { () => 
	            	{	            		
	            		goBack();
		            }}
		            rightIcons =
		            {
		            	[{
		                    name: 'empty',
		                    onPress: () => "",
		                }]
		            }/>

				<Dialog 
					visible = {this.state.showDateDlg} 
					onTouchOutside={() => this.setState({showDateDlg: false}, () => { this.date.blur(); })}
					supportedOrientations = {stuff.modalOrientations}>
					<View>
						<Calendar
							markedDates={{[this.state.startDateDlg ? this.state.startDate : this.state.endDate]: {selected: true}}}
    						// Initially visible month. Default = Date()
							current={this.state.startDateDlg ? this.state.startDate : this.state.endDate}
							// Handler which gets executed on day press. Default = undefined
							onDayPress={(day) => 
								{ 
									let di = this.endDate;
									let {endDate, startDate} = this.state;
									let obj = {endDate, startDate};
									if (this.state.startDateDlg)
									{
										di = this.startDate;
										obj.startDate = day.dateString;
									}
									else
										obj.endDate = day.dateString;

									if (obj.endDate < obj.startDate)
										obj.endDate = obj.startDate;
									obj.showDateDlg = false;
									this.setState(obj, () => {di.blur();this.fetchData();} ); 
								}}
							// Month format in calendar title. Formatting values: http://arshaw.com/xdate/#Formatting
							monthFormat={'yyyy MMMM'}
							// If firstDay=1 week starts from Monday. Note that dayNames and dayNamesShort should still start from Sunday.
							firstDay={1}
						/>						
					</View>
				</Dialog>

	            <ScrollView  style={{alignSelf: 'stretch'}} contentContainerStyle = { { padding: 20 } } bounces={false}>
		            {this.state.noFilter ? null : <View style={{paddingBottom: 20, marginBottom: 20, borderBottomWidth: 0.5, borderBottomColor: 'lightgray'}}>
			            <ButtonGroup
		      				onPress={(i) => 
		      					{
		      						let {endDate, startDate, periodSelectorShown} = this.state;
		      						let now = new Date();
		      						if (i == 0)
		      						{
		      							endDate = now.toYMD();
		      							startDate = now.addMonths(-1).toYMD();
		      							periodSelectorShown = false;
		      						}
		      						else if (i == 1)
		      						{
		      							endDate = now.toYMD();
		      							startDate = now.addMonths(-12).toYMD();
		      							periodSelectorShown = false;
		      						}
		      						else if (i == 2)
		      							periodSelectorShown = true;
		      						this.setState({periodSelected: i, startDate, endDate, periodSelectorShown}, () => 
		      						{
		      							if (!periodSelectorShown)
		      								this.fetchData();
		      						});
		      					}}
		      				selectedIndex={this.state.periodSelected}
		      				buttons={[I18n.t("statsPeriodMonth"), I18n.t("statsPeriodYear"), I18n.t("statsPeriodCustom")]}
		      				containerStyle={{ margin: 0, padding: 0 }}
		    			/>
		    			{this.state.periodSelectorShown ? <View style={{flexDirection: 'row'}}>
		            		<TextField 
		            			containerStyle = {styles.loginPageInput}
		            			ref = { (e) => this.startDate = e }
								autoCapitalize = 'none'
					            autoCorrect = {false}
					            onFocus={ () => this.setState({showDateDlg: true, startDateDlg: true})}
					            value = {this.state.startDate}
		            			label = { I18n.t('generalDateFrom') }/>
		            		<TextField 
		            			containerStyle = {styles.loginPageInput}
		            			ref = { (e) => this.endDate = e }
								autoCapitalize = 'none'
					            autoCorrect = {false}
					            onFocus={ () => this.setState({showDateDlg: true, startDateDlg: false})}
					            value = {this.state.endDate}
		            			label = { I18n.t('generalDateTo') }/>	    				
		    			</View> : <Text style={{textAlign: 'center',color: colors.disabled, fontStyle: "italic"}}>{I18n.t("statsStatsPeriod").replace("#", this.state.startDate).replace("@", this.state.endDate)}</Text>}		    		
	    			</View>}
	            	{this.state.error?<InfoBlock style={{marginTop: 0}} type="warning" text={this.state.error}/>:null}
	            	{this.state.busy?<ActivityIndicator animating size="large" />:
	            	(this.state.charts.length?
	            		this.state.charts.map((e,i) => 
	            		{
	            			if (e.person)
	            				return <Person key={i} item={e.person} onPress={ () => { navigate("ViewContact", {item: e.person}); } }/>;

	            			if (!e.chart)
	            				return null;
	            			return <View key={i} style={{flex: 1, marginBottom: 20}}>
	            				{e.title ? <Text style={{lineHeight: 30, height: 30, fontSize: 16}}>{e.title}</Text>: null}
	            			{e.chart}
	            		</View>})
            		:<InfoBlock style={{marginTop: 0}} type="warning" text={I18n.t("statsNoStats")}/>)}
	            </ScrollView>

    		</View>
    	);
  	}
}