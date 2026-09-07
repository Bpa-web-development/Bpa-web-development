async function loadSubscriptionPlans() {
    try {
        const response = await fetch("/data/SubscriptionPlanData.json");

        console.log(response)
        if (!response.ok) {
            throw new Error("Could not load SubscriptionPlanData.json");
        }

        const SubscriptionPlanData = await response.json();
        buildSubscriptionPlans(SubscriptionPlanData);
    } 
    catch (error) {
        console.error("Subscription Plan Data error:", error);
    }
    
}

function buildSubscriptionPlans(data) {
    const container = document.getElementById("subscription-card-container");

    let containerContent = '';

    data.forEach(plan => {
        console.log(plan)
        containerContent += 
            `   
            <div class="subscription-card">
                <h1>${plan.name}</h1>
                <p>Price: ${plan.price}</p>
                <p>${plan.description}</p>
                <img src="${plan.img}" alt="">
                <ul class="subscription-features">
                    ${plan.features.map(feature => `<li>${feature}</li>`).join('')}
                </ul>
                <button>Subscribe</button>
            </div>
                `
    })
    container.innerHTML = containerContent;
}


loadSubscriptionPlans();