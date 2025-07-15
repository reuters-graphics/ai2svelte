const shadows = [
	{
		source:
			'https://www.nytimes.com/interactive/2020/04/11/business/economy/coronavirus-us-economy-spending.html ',
		shadow:
			'text-shadow: rgba(0,0,0,1) 2px 0px 0px, rgba(0,0,0,1) 1.75517px 0.958851px 0px, rgba(0,0,0,1) 1.0806px 1.68294px 0px, rgba(0,0,0,1) 0.141474px 1.99499px 0px, rgba(0,0,0,1) -0.832294px 1.81859px 0px, rgba(0,0,0,1) -1.60229px 1.19694px 0px, rgba(0,0,0,1) -1.97998px 0.28224px 0px, rgba(0,0,0,1) -1.87291px -0.701566px 0px, rgba(0,0,0,1) -1.30729px -1.5136px 0px, rgba(0,0,0,1) -0.421592px -1.95506px 0px, rgba(0,0,0,1) 0.567324px -1.91785px 0px, rgba(0,0,0,1) 1.41734px -1.41108px 0px, rgba(0,0,0,1) 1.92034px -0.558831px 0px;',
		id: 'Vegan cheese'
	},
	{
		source:
			'https://www.nytimes.com/interactive/2021/09/15/nyregion/empire-state-building-reopening-new-york.html ',
		shadow:
			'text-shadow: 1px 1px 1px rgba(0,0,0,0.9), 1px -1px 1px rgba(0,0,0,0.9), -1px 1px 1px rgba(0,0,0,0.9), -1px -1px 1px rgba(0,0,0,0.9);',
		id: 'Gouda'
	},
	{
		source: 'https://www.nytimes.com/interactive/2021/12/11/us/tornado-maps-damage.html ',
		shadow: 'text-shadow: 0px 0px 3px rgba(0,0,0,1), 0px 0px 3px rgba(0,0,0,1), 0px 0px 3px rgba(0,0,0,1);',
		id: 'Cheddar'
	},
	{
		source: 'https://meet.google.com/ ',
		shadow: 'text-shadow: 0 1px 2px rgba(0,0,0,0.6), 0 0 2px rgba(0,0,0,0.3);',
		id: 'Parmesan'
	},
	{
		shadow: 'text-shadow: 0px 0px 1px rgba(0,0,0,1), 0px 0px 2px rgba(0,0,0,1), 0px 0px 3px rgba(0,0,0,1), 0px 0px 4px rgba(0,0,0,1);',
		source: 'https://www.nytimes.com/interactive/2022/world/europe/ukraine-maps.html',
		id: 'Brie'
	},
	{
		source: 'https://www.bloomberg.com/graphics/2021-palm-oil-deforestation-climate-change/ ',
		shadow: 'text-shadow: 0 0 2px rgba(0,0,0,1), 0 0 2px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,0.5);',
		id: 'Roquefort'
	},
	{
		source: 'https://www.bloomberg.com/graphics/2021-palm-oil-deforestation-climate-change/ ',
		shadow:
			'text-shadow: rgba(0,0,0,1) 1px 0px 0px, rgba(0,0,0,1) 0.540302px 0.841471px 0px, rgba(0,0,0,1) -0.416147px 0.909297px 0px, rgba(0,0,0,1) -0.989992px 0.14112px 0px, rgba(0,0,0,1) -0.653644px -0.756802px 0px, rgba(0,0,0,1) 0.283662px -0.958924px 0px, rgba(0,0,0,1) 0.96017px -0.279415px 0px;',
		id: 'Manchego'
	},
	{
		source: 'https://projects.propublica.org/toxmap/ ',
		shadow: 'text-shadow: 0 0 10px rgba(0,0,0,1), 0 0 10px rgba(0,0,0,1);',
		id: 'Mozzarella'
	},
	{
		source:
			'https://elpais.com/clima-y-medio-ambiente/2021-01-26/asi-es-belchatow-la-enorme-central-polaca-de-carbon-que-mas-co-emite-en-la-ue.html?target=_blank',
		shadow: 'text-shadow: -1px 0 rgba(0,0,0,1), 0 1px rgba(0,0,0,1), 1px 0 rgba(0,0,0,1), 0 -1px rgba(0,0,0,1);',
		id: 'Emmental'
	},
	{
		source:
			'https://www.nytimes.com/interactive/2020/09/24/climate/fires-worst-year-california-oregon-washington.html ',
		shadow: 'text-shadow: rgba(0,0,0,1) 0px 0px 3px, rgba(0,0,0,1) 0px 0px 3px;',
		id: 'Gorgonzola'
	},
	{
		source:
			'https://www.nytimes.com/interactive/2020/07/18/world/asia/china-india-border-conflict.html ',
		shadow: 'text-shadow: 0 0 10px #00000080, 0 0 3px #000000;',
		id: 'Feta'
	},
	{
		source: 'https://www.nytimes.com/interactive/2019/07/19/us/california-earthquakes.html ',
		shadow:
			'text-shadow: 1px 1px 0px rgba(0,0,0,0.7), 0px 1px 0px rgba(0,0,0,0.7), -1px 1px 0px rgba(0,0,0,0.7), -1px 0px 0px rgba(0,0,0,0.7), -1px -1px 0px rgba(0,0,0,0.7), 0px -1px 0px rgba(0,0,0,0.7), 1px -1px 0px rgba(0,0,0,0.7);',
		id: 'Provolone'
	},
	{
		source: 'https://www.nytimes.com/interactive/2019/09/11/us/midwest-flooding.html ',
		shadow: 'text-shadow: 0 0 4px rgba(0,0,0,0.7);',
		id: 'Havarti'
	},
	{
		source:
			'https://www.nytimes.com/interactive/2019/02/09/world/americas/brazil-dam-collapse.html ',
		shadow: 'text-shadow: 1px 1px 3px rgba(0,0,0,1);',
		id: 'Camembert'
	},
	{
		source:
			'https://www.nytimes.com/interactive/2020/08/04/world/middleeast/beirut-explosion-damage.html ',
		shadow:
			'text-shadow: rgba(0,0,0,0.3) 0.5px 0px 0px, rgba(0,0,0,0.3) 0.540302px 0.841471px 0px, rgba(0,0,0,0.3) -0.416147px 0.909297px 0px, rgba(0,0,0,0.3) -0.989992px 0.14112px 0px, rgba(0,0,0,0.3) -0.653644px -0.756802px 0px, rgba(0,0,0,0.3) 0.283662px -0.958924px 0px, rgba(0,0,0,0.3) 0.96017px -0.279415px 0px;',
		id: 'Asiago'
	},
	{
		source: 'https://www.nytimes.com/interactive/2020/10/03/us/rose-garden-event-covid.html ',
		shadow:
			'text-shadow: 1px 1px 3px rgba(0,0,0,0.3), -1px 1px 3px rgba(0,0,0,0.3), 1px -1px 3px rgba(0,0,0,0.3), -1px -1px 3px rgba(0,0,0,0.3);',
		id: 'Edam'
	},
	{
		source: 'https://graphics.reuters.com/AFGHANISTAN-CONFLICT/KABUL-AIRPORT/movannkgkpa/ ',
		shadow:
			'text-shadow: 1px 1px 1px rgba(0,0,0,0.7), -1px -1px 1px rgba(0,0,0,0.7), 1px -1px 1px rgba(0,0,0,0.7), -1px 1px 1px rgba(0,0,0,0.7);',
		id: 'Colby'
	},
	{
		source: 'https://www.washingtonpost.com/nation/interactive/2021/weather-disasters-2021 ',
		shadow: 'text-shadow: -2px 2px 6px rgba(0,0,0,1), 0 0 2px rgba(0,0,0,1), 2px 2px 6px rgba(0,0,0,1);',
		id: 'Fontina'
	},
	{
		source:
			'https://www.nytimes.com/interactive/2020/06/03/us/minneapolis-police-use-of-force.html ',
		shadow:
			'text-shadow: 1px 1px 1px rgba(0,0,0,0.3), -1px 1px 1px rgba(0,0,0,0.3), 1px -1px 1px rgba(0,0,0,0.3), -1px -1px 1px rgba(0,0,0,0.3), 2px 2px 2px rgba(0,0,0,0.3), -2px 2px 2px rgba(0,0,0,0.3), 2px -2px 2px rgba(0,0,0,0.3), -2px -2px 2px rgba(0,0,0,0.3);',
		id: 'Monterey Jack'
	},
	{
		source:
			'https://www.nytimes.com/interactive/2020/02/01/us/politics/democratic-presidential-campaign-donors.html ',
		shadow: 'text-shadow: 0px 0px 3px rgba(0,0,0,1), 0px 0px 5px rgba(0,0,0,1), 0px 0px 10px rgba(0,0,0,1);',
		id: 'Ricotta'
	},
	{
		source:
			'https://www.nytimes.com/interactive/2019/06/18/upshot/cities-across-america-question-single-family-zoning.html ',
		shadow: 'text-shadow: 0 1px 0 rgba(0,0,0,1), 1px 0 0 rgba(0,0,0,1), 0 -1px 0 rgba(0,0,0,1), -1px 0 0 rgba(0,0,0,1) !important;',
		id: 'Stilton'
	},
	{
		source:
			'https://www.nytimes.com/interactive/2019/03/11/world/boeing-737-max-which-airlines.html ',
		shadow: 'text-shadow: 0px 0px 5px rgba(0,0,0,1), 0px 0px 5px rgba(0,0,0,1);',
		id: 'Taleggio'
	},
	{
		source: 'https://www.nytimes.com/interactive/2020/09/21/us/covid-schools.html ',
		shadow: 'text-shadow: 1px -1px 0 rgba(0,0,0,1), 1px -1px 0 rgba(0,0,0,1), -1px 1px 0 rgba(0,0,0,1), 1px 1px 0 rgba(0,0,0,1);',
		id: 'Cotija'
	},
	{
		source: 'https://www.nytimes.com/2022/02/07/us/tsunami-northwest-evacuation-towers.html',
		shadow: 'text-shadow: 0px 0px 2px rgba(0,0,0,1);',
		id: 'Halloumi'
	},
	{
		source: 'https://www.washingtonpost.com/graphics/2017/national/harvey/ ',
		shadow:
			'text-shadow: 1px 1px 0px rgba(0,0,0,0.7), -1px -1px 0px rgba(0,0,0,0.7), -1px 1px 0px rgba(0,0,0,0.7), 1px -1px 0px rgba(0,0,0,0.7);',
		id: 'Pecorino'
	},
	{
		shadow: 'text-shadow: 1px 1px 2px rgba(0,0,0,0.5);',
		source: 'https://graphics.reuters.com/CHINA-CRASH/akpezjzxlvr/index.html',
		id: 'Burrata'
	},
	{
		shadow:
			'text-shadow: rgba(0,0,0,1) 1px 0px 0px,rgba(0,0,0,1) .5px .8px 0px,rgba(0,0,0,1) -.4px .9px 0px,rgba(0,0,0,1) -.98px .14px 0px,rgba(0,0,0,1) -.65px -.75px 0px,rgba(0,0,0,1) .28px -.95px 0px,rgba(0,0,0,1) .96px -.27px 0px;',
		source:
			'https://www.nytimes.com/interactive/2024/04/26/us/politics/us-china-military-bases-weapons.html',
		id: 'Raclette'
	},
	{
		source: 'https://www.washingtonpost.com/world/2023/10/18/gaza-war-damage-images-maps/',
		shadow: 'text-shadow: -1px -1px 0 rgba(0,0,0,1), 1px -1px 0 rgba(0,0,0,1), -1px 1px 0 rgba(0,0,0,1), 1px 1px 0 rgba(0,0,0,1);',
		id: 'Oloroso cheese'
	},
	{
		source:
			'https://www.nytimes.com/interactive/2025/06/12/world/middleeast/iran-israel-maps.html/',
		shadow: 'text-shadow: 1px 1px 0px rgba(0,0,0,1),-1px 1px 0px rgba(0,0,0,1),1px -1px 0px rgba(0,0,0,1),-1px -1px 0px rgba(0,0,0,1);',
		id: 'Pecorino II'
	}
];

const shadowsLocal = [
	{
		source:
			'https://www.nytimes.com/interactive/2020/04/11/business/economy/coronavirus-us-economy-spending.html ',
		shadow:
			'text-shadow: #000000 2px 0px 0px, #000000 1.75517px 0.958851px 0px, #000000 1.0806px 1.68294px 0px, #000000 0.141474px 1.99499px 0px, #000000 -0.832294px 1.81859px 0px, #000000 -1.60229px 1.19694px 0px, #000000 -1.97998px 0.28224px 0px, #000000 -1.87291px -0.701566px 0px, #000000 -1.30729px -1.5136px 0px, #000000 -0.421592px -1.95506px 0px, #000000 0.567324px -1.91785px 0px, #000000 1.41734px -1.41108px 0px, #000000 1.92034px -0.558831px 0px;',
		id: 'Vegan cheese'
	},
	{
		source:
			'https://www.nytimes.com/interactive/2021/09/15/nyregion/empire-state-building-reopening-new-york.html ',
		shadow:
			'text-shadow: 1px 1px 1px #000000E6, 1px -1px 1px #000000E6, -1px 1px 1px #000000E6, -1px -1px 1px #000000E6;',
		id: 'Gouda'
	},
	{
		source: 'https://www.nytimes.com/interactive/2021/12/11/us/tornado-maps-damage.html ',
		shadow: 'text-shadow: 0px 0px 3px #000000, 0px 0px 3px #000000, 0px 0px 3px #000000;',
		id: 'Cheddar'
	},
	{
		source: 'https://meet.google.com/ ',
		shadow: 'text-shadow: 0 1px 2px #00000099, 0 0 2px #0000004D;',
		id: 'Parmesan'
	},
	{
		shadow: 'text-shadow: 0px 0px 1px #000000, 0px 0px 2px #000000, 0px 0px 3px #000000, 0px 0px 4px #000000;',
		source: 'https://www.nytimes.com/interactive/2022/world/europe/ukraine-maps.html',
		id: 'Brie'
	},
	{
		source: 'https://www.bloomberg.com/graphics/2021-palm-oil-deforestation-climate-change/ ',
		shadow: 'text-shadow: 0 0 2px #000000, 0 0 2px #000000CC, 0 0 2px #00000080;',
		id: 'Roquefort'
	},
	{
		source: 'https://www.bloomberg.com/graphics/2021-palm-oil-deforestation-climate-change/ ',
		shadow:
			'text-shadow: #000000 1px 0px 0px, #000000 0.540302px 0.841471px 0px, #000000 -0.416147px 0.909297px 0px, #000000 -0.989992px 0.14112px 0px, #000000 -0.653644px -0.756802px 0px, #000000 0.283662px -0.958924px 0px, #000000 0.96017px -0.279415px 0px;',
		id: 'Manchego'
	},
	{
		source: 'https://projects.propublica.org/toxmap/ ',
		shadow: 'text-shadow: 0 0 10px #000000, 0 0 10px #000000;',
		id: 'Mozzarella'
	},
	{
		source:
			'https://elpais.com/clima-y-medio-ambiente/2021-01-26/asi-es-belchatow-la-enorme-central-polaca-de-carbon-que-mas-co-emite-en-la-ue.html?target=_blank',
		shadow: 'text-shadow: -1px 0 #000000, 0 1px #000000, 1px 0 #000000, 0 -1px #000000;',
		id: 'Emmental'
	},
	{
		source:
			'https://www.nytimes.com/interactive/2020/09/24/climate/fires-worst-year-california-oregon-washington.html ',
		shadow: 'text-shadow: #000000 0px 0px 3px, #000000 0px 0px 3px;',
		id: 'Gorgonzola'
	},
	{
		source:
			'https://www.nytimes.com/interactive/2020/07/18/world/asia/china-india-border-conflict.html ',
		shadow: 'text-shadow: 0 0 10px #00000080, 0 0 3px #000000;',
		id: 'Feta'
	},
	{
		source: 'https://www.nytimes.com/interactive/2019/07/19/us/california-earthquakes.html ',
		shadow:
			'text-shadow: 1px 1px 0px #000000B3, 0px 1px 0px #000000B3, -1px 1px 0px #000000B3, -1px 0px 0px #000000B3, -1px -1px 0px #000000B3, 0px -1px 0px #000000B3, 1px -1px 0px #000000B3;',
		id: 'Provolone'
	},
	{
		source: 'https://www.nytimes.com/interactive/2019/09/11/us/midwest-flooding.html ',
		shadow: 'text-shadow: 0 0 4px #000000B3;',
		id: 'Havarti'
	},
	{
		source:
			'https://www.nytimes.com/interactive/2019/02/09/world/americas/brazil-dam-collapse.html ',
		shadow: 'text-shadow: 1px 1px 3px #000000;',
		id: 'Camembert'
	},
	{
		source:
			'https://www.nytimes.com/interactive/2020/08/04/world/middleeast/beirut-explosion-damage.html ',
		shadow:
			'text-shadow: #0000004D 0.5px 0px 0px, #0000004D 0.540302px 0.841471px 0px, #0000004D -0.416147px 0.909297px 0px, #0000004D -0.989992px 0.14112px 0px, #0000004D -0.653644px -0.756802px 0px, #0000004D 0.283662px -0.958924px 0px, #0000004D 0.96017px -0.279415px 0px;',
		id: 'Asiago'
	},
	{
		source: 'https://www.nytimes.com/interactive/2020/10/03/us/rose-garden-event-covid.html ',
		shadow:
			'text-shadow: 1px 1px 3px #0000004D, -1px 1px 3px #0000004D, 1px -1px 3px #0000004D, -1px -1px 3px #0000004D;',
		id: 'Edam'
	},
	{
		source: 'https://graphics.reuters.com/AFGHANISTAN-CONFLICT/KABUL-AIRPORT/movannkgkpa/ ',
		shadow:
			'text-shadow: 1px 1px 1px #000000B3, -1px -1px 1px #000000B3, 1px -1px 1px #000000B3, -1px 1px 1px #000000B3;',
		id: 'Colby'
	},
	{
		source: 'https://www.washingtonpost.com/nation/interactive/2021/weather-disasters-2021 ',
		shadow: 'text-shadow: -2px 2px 6px #000000, 0 0 2px #000000, 2px 2px 6px #000000;',
		id: 'Fontina'
	},
	{
		source:
			'https://www.nytimes.com/interactive/2020/06/03/us/minneapolis-police-use-of-force.html ',
		shadow:
			'text-shadow: 1px 1px 1px #0000004D, -1px 1px 1px #0000004D, 1px -1px 1px #0000004D, -1px -1px 1px #0000004D, 2px 2px 2px #0000004D, -2px 2px 2px #0000004D, 2px -2px 2px #0000004D, -2px -2px 2px #0000004D;',
		id: 'Monterey Jack'
	},
	{
		source:
			'https://www.nytimes.com/interactive/2020/02/01/us/politics/democratic-presidential-campaign-donors.html ',
		shadow: 'text-shadow: 0px 0px 3px #000000, 0px 0px 5px #000000, 0px 0px 10px #000000;',
		id: 'Ricotta'
	},
	{
		source:
			'https://www.nytimes.com/interactive/2019/06/18/upshot/cities-across-america-question-single-family-zoning.html ',
		shadow: 'text-shadow: 0 1px 0 #000000, 1px 0 0 #000000, 0 -1px 0 #000000, -1px 0 0 #000000 !important;',
		id: 'Stilton'
	},
	{
		source:
			'https://www.nytimes.com/interactive/2019/03/11/world/boeing-737-max-which-airlines.html ',
		shadow: 'text-shadow: 0px 0px 5px #000000, 0px 0px 5px #000000;',
		id: 'Taleggio'
	},
	{
		source: 'https://www.nytimes.com/interactive/2020/09/21/us/covid-schools.html ',
		shadow: 'text-shadow: 1px -1px 0 #000000, 1px -1px 0 #000000, -1px 1px 0 #000000, 1px 1px 0 #000000;',
		id: 'Cotija'
	},
	{
		source: 'https://www.nytimes.com/2022/02/07/us/tsunami-northwest-evacuation-towers.html',
		shadow: 'text-shadow: 0px 0px 2px #000000;',
		id: 'Halloumi'
	},
	{
		source: 'https://www.washingtonpost.com/graphics/2017/national/harvey/ ',
		shadow:
			'text-shadow: 1px 1px 0px #000000B3, -1px -1px 0px #000000B3, -1px 1px 0px #000000B3, 1px -1px 0px #000000B3;',
		id: 'Pecorino'
	},
	{
		shadow: 'text-shadow: 1px 1px 2px #00000080;',
		source: 'https://graphics.reuters.com/CHINA-CRASH/akpezjzxlvr/index.html',
		id: 'Burrata'
	},
	{
		shadow:
			'text-shadow: #000000 1px 0px 0px,#000000 .5px .8px 0px,#000000 -.4px .9px 0px,#000000 -.98px .14px 0px,#000000 -.65px -.75px 0px,#000000 .28px -.95px 0px,#000000 .96px -.27px 0px;',
		source:
			'https://www.nytimes.com/interactive/2024/04/26/us/politics/us-china-military-bases-weapons.html',
		id: 'Raclette'
	},
	{
		source: 'https://www.washingtonpost.com/world/2023/10/18/gaza-war-damage-images-maps/',
		shadow: 'text-shadow: -1px -1px 0 #000000, 1px -1px 0 #000000, -1px 1px 0 #000000, 1px 1px 0 #000000;',
		id: 'Oloroso cheese'
	},
	{
		source:
			'https://www.nytimes.com/interactive/2025/06/12/world/middleeast/iran-israel-maps.html/',
		shadow: 'text-shadow: 1px 1px 0px #000000,-1px 1px 0px #000000,1px -1px 0px #000000,-1px -1px 0px #000000;',
		id: 'Pecorino II'
	}
];

// remove duplicates
export default [...new Map(shadowsLocal.map((s) => [s.shadow, s])).values()];

export const cheeses = [
	"Pie charts can't solve existential crises but they'll try anyway, dividing everything into neat, colorful slices of confusion.",
	"Bar graphs love to show off their height at parties, towering over the pie charts and quietly judging the scatter plots.",
	"Scatter plots secretly dream of becoming constellations, hoping someone will connect their dots and find meaning in the chaos.",
	"Heatmaps just want your data to look like abstract art, blending colors in ways that make even statisticians squint.",
	"Line graphs think every trend deserves a roller coaster ride, gleefully twisting and turning across the grid.",
	"Venn diagrams are always searching for the perfect overlap, convinced that world peace is just three circles away.",
	"Histograms wish they could bin life’s messier moments, organizing chaos one awkward interval at a time.",
	"Box plots throw parties and invite all the outliers, making sure everyone knows who doesn’t fit in.",
	"Radar charts pretend to be superhero masks at night, saving the world one multi-dimensional dataset at a time.",
	"Choropleth maps believe they can paint the world with awkward shades, even if nobody agrees on which color means what."
];