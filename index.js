import fastify from 'fastify'
import fetch from 'node-fetch'
import { parse } from 'himalaya'

const server = fastify({
	logger: {
		prettyPrint: true
	}
})

server.register(import('fastify-cors'), {
	origin: '*' // disable cors
})

server.get('/edt/:user/:date', async (request, reply) => {
	const date = request.params.date.split('-')
	let dateString = ''
	date.forEach((number, index) => {
		dateString += `${number}${index !== date.length - 1 ? '%2F' : ''}`
	})
	console.log(
		'request.params.user: ',
		request.params.user,
		' dateString: ',
		dateString
	)
	const url = `https://edtmobiliteng.wigorservices.net/WebPsDyn.aspx?action=posETUD&serverid=C&Tel=${request.params.user}&date=${dateString}`
	console.log('url', url)
	const response = await fetch(url)
	const body = await response.text()
	console.log('body', body)

	const htmlJson = parse(body)
	// const days = getDays(htmlJson[3].children[2].children[7].children)
	// const formatedJSON = formatJSON(
	// 	htmlJson[3].children[2].children[7].children,
	// 	days
	// )

	// return lessonsToDays(formatedJSON)
	const lessonsHtml = parseDay(htmlJson[1].children[3].children[6].children)
	const lessons = formatLessons(lessonsHtml)
	return lessons
})

server.listen(8080, (err, address) => {
	if (err) {
		console.error(err)
		process.exit(1)
	}
	console.log(`Server listening at ${address}`)
})

const parseDay = (dayHtml) => {
	return dayHtml.filter((element) => {
		return element?.attributes?.some((attr) => attr.value === 'Ligne')
	})
}

const formatLessons = (lessonsHtml) => {
	return lessonsHtml.map((lesson) => {
		return {
			startHour: lesson.children[0].children[0].content,
			endHour: lesson.children[1].children[0].content,
			name: lesson.children[2].children[0].content,
			room: lesson.children[3].children[0].content,
			teacher: lesson.children[4].children[0].content
		}
	})
}

const getDays = (HTMLJSON, days) => {
	const Htmldays = HTMLJSON.filter((canBeDay) => {
		return canBeDay.attributes?.find(
			(attr) => attr.key === 'class' && attr.value === 'Jour'
		)
	})
	return Htmldays.map((day, index) => {
		const style = day.attributes[1].value
		const left = style.split(';')[1]
		const percent = left.split(':')[1]
		const leftNumber = percent.slice(0, -1)
		return {
			day: day.children[1].children[0].children[0].children[0].content,
			left: leftNumber,
			index
		}
	})
}

const lessonsToDays = (json) => {
	return json.reduce((days, value) => {
		const currentDay = value.day
		const day = days.find((day) => day.day === currentDay)
		if (day) {
			day.lessons.push(value)
		} else {
			days.push({ day: currentDay, index: value.index, lessons: [value] })
		}
		return days
	}, [])
}

const formatJSON = (HTML, days) => {
	const colors = ['#03A9F4', '#009688', '#3F51B5', '#dbb044']
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
			heure: tempHeure,
			matiere: tempMatiere,
			salle: tempSalle,
			info: tempInfo,
			prof: tempProf,
			day: closest.day,
			index: closest.index,
			color
			// prof: tempProf,
			// color: colors[configColor.colorIndex]
		}
	})

	return JsonDays
}
