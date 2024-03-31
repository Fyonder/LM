const firebaseConfig = {
    apiKey: "AIzaSyBIA0Oi4Q5-yEwHyrKj-GKlNXn54Am6OyM",
    authDomain: "lm-barber.firebaseapp.com",
    projectId: "lm-barber",
    storageBucket: "lm-barber.appspot.com",
    messagingSenderId: "859621213960",
    appId: "1:859621213960:web:6fb1b90cf3b5b9cd9c8ebd",
    measurementId: "G-CV5LKK8MKM"
  };

  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();

          const menu = document.getElementById("menu");
          const cartBtn = document.getElementById("cart-btn");
          const cartModal = document.getElementById("cart-modal");
          const cartItemsContainer = document.getElementById("cart-items");
          const cartTotal = document.getElementById("cart-total");
          const checkoutBtn = document.getElementById("checkout-btn");
          const closeModalBtn = document.getElementById("close-modal-btn");
          const cartCounter = document.getElementById("cart-count");
          const nameInput = document.getElementById("name");
          const phoneInput = document.getElementById("phone");
          const dateInput = document.getElementById("date");
          const timeInput = document.getElementById("time");

          // Variável para armazenar itens do carrinho
          let cart = [];

          // Função para abrir o modal do carrinho
          cartBtn.addEventListener("click", function() {
              updateCartModal();
              cartModal.style.display = "flex";
          });

          // Função para fechar o modal quando clicar fora
          cartModal.addEventListener("click", function(event) {
              if (event.target === cartModal) {
                  cartModal.style.display = "none";
              }
          });

          // Função para fechar o modal ao clicar no botão de fechar
          closeModalBtn.addEventListener("click", function() {
              cartModal.style.display = "none";
          });

          // Função para adicionar itens ao carrinho
          menu.addEventListener("click", function(event) {
              let parentButton = event.target.closest(".add-to-cart-btn");

              if (parentButton) {
                  const name = parentButton.getAttribute("data-name");
                  const price = parseFloat(parentButton.getAttribute("data-price"));
                  addToCart(name, price);
              }
          });

          // Função para adicionar item ao carrinho
          function addToCart(name, price) {
              const existingItem = cart.find(item => item.name === name);

              if (existingItem) {
                  existingItem.quantity += 1;
              } else {
                  cart.push({
                      name,
                      price,
                      quantity: 1
                  });
              }
              updateCartModal();
          }

          // Função para atualizar o modal do carrinho
          function updateCartModal() {
              cartItemsContainer.innerHTML = "";
              let total = 0;

              cart.forEach(item => {
                  const cartItemElement = document.createElement("div");

                  cartItemElement.classList.add("flex", "justify-between", "mb-4", "flex-col");
                  cartItemElement.innerHTML = `
                      <div class="flex items-center justify-between">
                          <div>
                              <p class="font-bold">${item.name}</p>
                              <p>Qtd: ${item.quantity}</p>
                              <p class="font-bold mt-2">R$ ${item.price.toFixed(2)}</p>
                          </div>
                              
                          <button class="remove-from-cart-btn" data-name="${item.name}">
                              Remover
                          </button>
                      </div>
                  `;
                  total += item.price * item.quantity;

                  cartItemsContainer.appendChild(cartItemElement);
              });
              cartTotal.textContent = total.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL"
              });

              cartCounter.innerHTML = cart.length;
          }

          // Função para remover item do carrinho
          cartItemsContainer.addEventListener("click", function(event) {
              if (event.target.classList.contains("remove-from-cart-btn")) {
                  const name = event.target.getAttribute("data-name");
                  removeItemCart(name);
              }
          });

          // Função para remover item do carrinho
          function removeItemCart(name) {
              const index = cart.findIndex(item => item.name === name);

              if (index !== -1) {
                  const item = cart[index];

                  if (item.quantity > 1) {
                      item.quantity -= 1;
                      updateCartModal();
                      return;
                  }
                  cart.splice(index, 1);
                  updateCartModal();
              }
          }
          checkoutBtn.addEventListener("click", function() {
            const isOpen = checkRestaurantOpen();
        
            if (!isOpen) {
                alert("Barbearia Fechada No Momento!!");
                return;
            }
            
            if (cart.length === 0) return;
            
            const name = nameInput.value;
            const phone = phoneInput.value;
            const date = dateInput.value;
            const time = timeInput.value;
            
            if (name && phone && date && time) {
                db.collection("appointments")
                    .where("date", "==", date)
                    .where("time", "==", time)
                    .get()
                    .then((querySnapshot) => {
                        if (querySnapshot.empty) {
                            const appointmentData = {
                                name: name,
                                phone: phone,
                                date: date,
                                time: time,
                                cart: cart
                            };
        
                            db.collection("appointments")
                                .add(appointmentData)
                                .then(function(docRef) {
                                    console.log("Agendamento enviado com sucesso! ID do documento:", docRef.id);
                                    document.getElementById("appointmentForm").reset();
                                    cart = [];
                                    updateCartModal();
                                    alert("Pedido enviado com sucesso!");
                                    
                                    // Enviar mensagem para o WhatsApp
                                    const whatsappURL = `https://wa.me/7996109024/?text=Olá! Tenho interesse em agendar um horário.%0ANome:%20${name}%0ATelefone:%20${phone}%0AData:%20${date}%0AHorário:%20${time}`;
                                    window.open(whatsappURL, "_blank");
                                })
                                .catch(function(error) {
                                    console.error("Erro ao enviar agendamento:", error);
                                    alert("Erro ao enviar agendamento. Por favor, tente novamente mais tarde.");
                                });
                        } else {
                            alert("Essa hora já está agendada. Por favor, selecione outra hora.");
                        }
                    })
                    .catch((error) => {
                        console.error("Erro ao verificar agendamento:", error);
                        alert("Erro ao verificar agendamento. Por favor, tente novamente mais tarde.");
                    });
            } else {
                alert("Por favor, preencha todos os campos do formulário.");
            }
        });
        
          
          // Função para obter os detalhes do carrinho
          function getCartDetails() {
              return cart.map((item) => {
                  return `${item.name} Quantidade: (${item.quantity}) Preço: R$${item.price.toFixed(2)} |`;
              }).join("");
          }

          // Função para verificar se o restaurante está aberto
          function checkRestaurantOpen() {
              const data = new Date();
              const hour = data.getHours();
              return (hour >= 10 && hour < 24) || (hour >= 0 && hour < 5); // Aberto das 10h às 3h
          }

          // Verificar se o restaurante está aberto e atualizar o estilo
          const spanItem = document.getElementById("date-span");
          const isOpen = checkRestaurantOpen();

          if (isOpen) {
              spanItem.classList.remove("bg-red-500");
              spanItem.classList.add("bg-green-600");
          } else {
              spanItem.classList.remove("bg-green-600");
              spanItem.classList.add("bg-red-500");
          }
