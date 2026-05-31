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
            receiver=user,
            deleted_by_sender=False
        ) | Message.objects.filter(
            sender=user,
            receiver=request.user,
            deleted_by_receiver=False
        )

        last_message = last_message.order_by(
            '-timestamp'
        ).first()

        # Only display in sidebar if a conversation already exists!
        if last_message:
            user_data.append({

                'user': user,

                'last_message': last_message

            })

    user_data = sorted(
        user_data,
        key=lambda x: x['last_message'].timestamp,
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
        msg = None

        if message:

            msg = Message.objects.create(

                sender=request.user,

                receiver=receiver,

                message=message

            )

        if request.headers.get('x-requested-with') == 'XMLHttpRequest' and msg:
            return JsonResponse({
                'status': 'success',
                'message_id': msg.id
            })

        return redirect(f'/chat/{id}/')

    # SHOW MESSAGES
    messages = Message.objects.filter(
        sender=request.user,
        receiver=receiver,
        deleted_by_sender=False
    ) | Message.objects.filter(
        sender=receiver,
        receiver=request.user,
        deleted_by_receiver=False
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


@login_required
def clear_chat(request, id):
    receiver = get_object_or_404(User, id=id)
    
    Message.objects.filter(
        sender=request.user,
        receiver=receiver
    ).update(deleted_by_sender=True)

    Message.objects.filter(
        sender=receiver,
        receiver=request.user
    ).update(deleted_by_receiver=True)

    return JsonResponse({'status': 'success'})


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
        receiver=receiver,
        deleted_by_sender=False
    ) | Message.objects.filter(
        sender=receiver,
        receiver=request.user,
        deleted_by_receiver=False
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


@login_required
def search_users(request):
    query = request.GET.get('q', '').strip()
    
    # 1. If query is empty, fetch all active conversations dynamically from database!
    if not query:
        users = User.objects.exclude(id=request.user.id)
        active_users = []
        for u in users:
            last_message = Message.objects.filter(
                sender=request.user, receiver=u, deleted_by_sender=False
            ) | Message.objects.filter(
                sender=u, receiver=request.user, deleted_by_receiver=False
            )
            last_message = last_message.order_by('-timestamp').first()
            if last_message:
                active_users.append({
                    'user': u,
                    'last_message': last_message
                })
        
        # Sort by most recent message
        active_users = sorted(
            active_users,
            key=lambda x: x['last_message'].timestamp,
            reverse=True
        )
        
        results = []
        for item in active_users:
            u = item['user']
            last_msg = item['last_message']
            has_custom_image = u.profile.image and u.profile.image.name != 'profile/default.png' and u.profile.image.name != 'default.png'
            img_url = u.profile.image_url if has_custom_image else None
            
            # Truncate preview
            preview = last_msg.message
            if len(preview) > 25:
                preview = preview[:22] + "..."
                
            is_unread = not last_msg.is_seen and last_msg.sender != request.user
            
            results.append({
                'id': u.id,
                'username': u.username,
                'img_url': img_url,
                'first_letter': u.username[0].upper() if u.username else '',
                'preview': preview,
                'is_unread': is_unread
            })
        return JsonResponse({'users': results})
        
    # 2. If query has text, perform database search
    matching_users = User.objects.filter(username__icontains=query).exclude(id=request.user.id)[:10]
    
    results = []
    for u in matching_users:
        has_custom_image = u.profile.image and u.profile.image.name != 'profile/default.png' and u.profile.image.name != 'default.png'
        img_url = u.profile.image_url if has_custom_image else None
        
        results.append({
            'id': u.id,
            'username': u.username,
            'img_url': img_url,
            'first_letter': u.username[0].upper() if u.username else '',
            'preview': 'Click to start chatting',
            'is_unread': False
        })
        
    return JsonResponse({'users': results})