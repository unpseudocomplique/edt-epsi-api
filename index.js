import fastify from 'fastify'
import fetch from 'node-fetch'
import { parse } from 'himalaya'
const fastify = require('fastify')()

const server = fastify({
	logger: {
		prettyPrint: true
	}
})

server.register(require('fastify-cors'), {
	origin: false // disable cors
})

server.get('/edt/:user/:date', async (request, reply) => {
	console.log('request', request.params)
	const response = await fetch(
		`https://edtmobiliteng.wigorservices.net//WebPsDyn.aspx?action=posEDTBEECOME&serverid=C&Tel=${request.params.user}&date=${request.params.date}`
	)
	const body = await response.text()

	const htmlJson = parse(body)
	const days = getDays(htmlJson[3].children[2].children[7].children)
	const formatedJSON = formatJSON(
		htmlJson[3].children[2].children[7].children,
		days
	)

	return formatedJSON
})

server.listen(8080, (err, address) => {
	if (err) {
		console.error(err)
		process.exit(1)
	}
	console.log(`Server listening at ${address}`)
})

const getDays = (HTMLJSON, days) => {
	const Htmldays = HTMLJSON.filter((canBeDay) => {
		return canBeDay.attributes?.find(
			(attr) => attr.key === 'class' && attr.value === 'Jour'
		)
	})
	return Htmldays.map((day) => {
		const style = day.attributes[1].value
		const left = style.split(';')[1]
		const percent = left.split(':')[1]
		const leftNumber = percent.slice(0, -1)
		return {
			day: day.children[1].children[0].children[0].children[0].content,
			left: leftNumber
		}
	})
}

const formatJSON = (HTML, days) => {
	const colors = ['#03A9F4', '#009688', '#3F51B5', '#fbc02d']
	const Htmldays = HTML.filter((canBeDay) => {
		return (
			canBeDay.type === 'element' && canBeDay.attributes[0]?.value === 'Case'
		)
	})
	const configColor = {
		salle: '',
		prof: '',
		matiere: '',
		colorIndex: -1,
		maxIndex: colors.length
	}

	const JsonDays = Htmldays.map((day) => {
		const tempHeure =
			day.children[0].children[1].children[0].children[2].children[0]
				.children[0].content || ''
		const tempMatiere =
			day.children[0].children[1].children[0].children[0].children[0]
				.children[2].content || ''
		const tempInfo =
			day.children[0].children[1].children[0].children[1].children[0]
				.children[3] || ''
		const tempProf =
			day.children[0].children[1].children[0].children[1].children[0]
				.children[0].content || ''
		const tempSalle =
			day.children[0].children[1].children[0].children[2].children[1]
				.children[0].content || ''
		const style = day.attributes[1].value || ''
		const left = style.split(';')[3]
		const percent = left.split(':')[1]
		const leftNumber = parseFloat(percent.slice(0, -1))

		const closest = days.reduce((a, b) => {
			return Math.abs(parseInt(b.left) - leftNumber) <
				Math.abs(parseInt(a.left) - parseInt(leftNumber))
				? b
				: a
		})
		let color = colors[configColor.colorIndex]
		if (
			(configColor.salle !== tempSalle,
			configColor.prof !== tempProf,
			configColor.matiere !== tempMatiere)
		) {
			configColor.salle = tempSalle
			configColor.prof = tempProf
			configColor.matiere = tempMatiere
			configColor.colorIndex =
				configColor.colorIndex + 1 < configColor.maxIndex
					? configColor.colorIndex + 1
					: 0
			color = colors[configColor.colorIndex]
		}
		return {
			tempHeure: tempHeure,
			matiere: tempMatiere,
			salle: tempSalle,
			info: tempInfo,
			prof: tempProf,
			day: new Date(closest.day),
			color
			// prof: tempProf,
			// color: colors[configColor.colorIndex]
		}
	})

	return JsonDays
}
