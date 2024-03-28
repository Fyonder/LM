// Array para armazenar os horários já agendados
var horariosAgendados = [];

// Simulação de horários já agendados (isso seria substituído por dados vindos do backend)
horariosAgendados.push({date: '2024-04-01', time: '10:00'});
horariosAgendados.push({date: '2024-04-01', time: '11:00'});
horariosAgendados.push({date: '2024-04-02', time: '09:00'});
horariosAgendados.push({date: '2024-04-02', time: '14:00'});

document.getElementById("appointmentForm").addEventListener("submit", function(event) {
    event.preventDefault();

    var name = document.getElementById("name").value;
    var phone = document.getElementById("phone").value;
    var date = document.getElementById("date").value;
    var time = document.getElementById("time").value;

    var message = document.getElementById("message");

    // Verificar se o horário selecionado já está agendado
    if (isHorarioAgendado(date, time)) {
        message.innerHTML = "Este horário já está agendado. Por favor, escolha outro horário.";
        message.style.color = "red";
        message.style.display = "block";
        return;
    }

    // Adicionar o novo horário aos horários agendados
    horariosAgendados.push({date: date, time: time});

    message.innerHTML = "Agendamento recebido!<br>Nome: " + name + "<br>Telefone: " + phone + "<br>Data: " + date + "<br>Horário: " + time;
    message.style.color = "green";
    message.style.display = "block";

    // Substitua "whatsapp_number" pela URL que inicia uma conversa no WhatsApp com o dono da barbearia
    var whatsappURL = "https://wa.me/8181792693/?text=Olá! Tenho interesse em agendar um horário.%0ANome:%20" + name + "%0ATelefone:%20" + phone + "%0AData:%20" + date + "%0AHorário:%20" + time;
    window.open(whatsappURL, "_blank");

    setTimeout(function() {
        message.style.display = "none";
    }, 5000);
});

// Função para verificar se o horário selecionado está agendado
function isHorarioAgendado(date, time) {
    for (var i = 0; i < horariosAgendados.length; i++) {
        if (horariosAgendados[i].date === date && horariosAgendados[i].time === time) {
            return true;
        }
    }
    return false;
}
