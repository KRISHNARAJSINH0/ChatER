import profile

from django.shortcuts import render, redirect
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login
from django.contrib import messages
from .models import Message
from django.contrib.auth.decorators import login_required
from django.contrib.auth import logout
from django.utils import timezone
from .models import Profile
from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from django.template.loader import render_to_string

# LOGIN PAGE
def login_page(request):

    if request.method == "POST":

        username = request.POST.get('username')
        password = request.POST.get('password')

        user = authenticate(
            request,
            username=username,
            password=password
        )

        if user is not None:

            login(request, user)

            profile, created = Profile.objects.get_or_create(
                user=user
            )
            profile.is_online = True

            profile.save()

            return redirect('/home/')

        else:
            messages.error(request, "Invalid Username or Password")

    return render(request, 'login_page.html')


# SIGNUP PAGE
def signup(request):

    if request.method == "POST":

        first_name = request.POST.get('first_name')
        last_name = request.POST.get('last_name')
        username = request.POST.get('username')
        email = request.POST.get('email')
        password = request.POST.get('password')

        # Check username already exists
        if User.objects.filter(username=username).exists():

            messages.error(request, "Username already exists")

            return redirect('/')

        # Create new user
        user = User.objects.create_user(
            first_name=first_name,
            last_name=last_name,
            username=username,
            email=email,
            password=password
        )

        user.save()

        messages.success(request, "Account Created Successfully")

        return redirect('/')

    return render(request, 'signup.html')


# HOME PAGE
@login_required
def home(request):

    users = User.objects.exclude(
        id=request.user.id
    )

    user_data = []

    for user in users:

        last_message = Message.objects.filter(
            sender=request.user,
            receiver=user
        ) | Message.objects.filter(
            sender=user,
            receiver=request.user
        )

        last_message = last_message.order_by(
            '-timestamp'
        ).first()

        user_data.append({

            'user': user,

            'last_message': last_message

        })

    user_data = sorted(

    user_data,

    key=lambda x:
    x['last_message'].timestamp
    if x['last_message']
    else timezone.datetime(
        1970,
        1,
        1,
        tzinfo=timezone.get_current_timezone()
    ),

    reverse=True

)

    return render(request, 'home.html', {

        'user_data': user_data

    })

@login_required
def chat_page(request, id):

    receiver = User.objects.get(id=id)

    Message.objects.filter(

    sender=receiver,

    receiver=request.user,

    is_seen=False

        ).update(is_seen=True)

    # SEND MESSAGE
    if request.method == "POST":

        message = request.POST.get('message')

        if message:

            Message.objects.create(

                sender=request.user,

                receiver=receiver,

                message=message

            )

        return redirect(f'/chat/{id}/')

    # SHOW MESSAGES
    messages = Message.objects.filter(
        sender=request.user,
        receiver=receiver
    ) | Message.objects.filter(
        sender=receiver,
        receiver=request.user
    )

    messages = messages.order_by('timestamp')

    return render(request, 'chat.html', {

        'receiver': receiver,

        'messages': messages

    })

def logout_page(request):

    profile, created = Profile.objects.get_or_create(
        user=request.user
    )

    profile.is_online = False

    profile.save()

    logout(request)

    return redirect('/')

@login_required
def profile(request):

    if request.method == "POST":

        user = request.user

        # UPDATE USER DATA

        user.username = request.POST.get('username')

        user.first_name = request.POST.get('first_name')

        user.last_name = request.POST.get('last_name')

        user.email = request.POST.get('email')


        # UPDATE PROFILE IMAGE

        if request.FILES.get('image'):

            profile, created = Profile.objects.get_or_create(
                user=user
            )

            profile.image = request.FILES.get('image')

            profile.save()


        # SAVE USER

        user.save()

        return redirect('/home/')


    return render(request, 'profile.html')


def delete_message(request, id):

    message = get_object_or_404(
        Message,
        id=id
    )

    if message.sender == request.user:

        message.is_deleted = True

        message.save()

    return redirect(f'/chat/{message.receiver.id}/')


typing_users = {}
def typing_status(request):

    username = request.GET.get('username')

    receiver = request.GET.get('receiver')

    key = f"{username}_{receiver}"

    typing_users[key] = True

    return JsonResponse({

        'status': 'typing'

    })


def get_messages(request, id):

    receiver = User.objects.get(id=id)

    messages = Message.objects.filter(
        sender=request.user,
        receiver=receiver
    ) | Message.objects.filter(
        sender=receiver,
        receiver=request.user
    )

    messages = messages.order_by('timestamp')

    html = render_to_string(

        'messages.html',

        {

            'messages': messages,

            'request': request

        }

    )

    return JsonResponse({

        'html': html

    })